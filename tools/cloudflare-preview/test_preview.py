import json
import os
import sqlite3
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PREVIEW = ROOT / "tools" / "cloudflare-preview"


class PreviewProxyTest(unittest.TestCase):
    def test_generator_rejects_non_worker_targets(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [
                    "node",
                    str(PREVIEW / "write-proxy.mjs"),
                    "https://calwise-api.lastlab.win",
                    str(Path(directory) / "_worker.js"),
                ],
                capture_output=True,
                text=True,
            )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("https://*.workers.dev", result.stderr)

    def test_generated_worker_proxies_only_api_routes_and_rewrites_origin(self):
        with tempfile.TemporaryDirectory() as directory:
            worker = Path(directory) / "_worker.mjs"
            subprocess.run(
                [
                    "node",
                    str(PREVIEW / "write-proxy.mjs"),
                    "https://pr-42-calwise-api.example.workers.dev",
                    str(worker),
                ],
                check=True,
            )
            script = f"""
              import worker from {str(worker)!r};
              let upstream;
              globalThis.fetch = async request => {{
                upstream = request;
                return new Response(null, {{ status: 204 }});
              }};
              let assetCalls = 0;
              const env = {{ ASSETS: {{ fetch: async () => {{ assetCalls++; return new Response('asset'); }} }} }};
              await worker.fetch(new Request('https://pr-42.calwise.pages.dev/trpc/greeting.current'), env);
              if (upstream.url !== 'https://pr-42-calwise-api.example.workers.dev/trpc/greeting.current') throw new Error(upstream.url);
              if (upstream.headers.get('origin') !== 'https://pr-42-calwise-api.example.workers.dev') throw new Error('origin');
              await worker.fetch(new Request('https://pr-42.calwise.pages.dev/not-an-api'), env);
              if (assetCalls !== 1) throw new Error('asset routing');
            """
            subprocess.run(["node", "--input-type=module", "--eval", script], check=True)


class WorkerPreviewSettingsTest(unittest.TestCase):
    def run_module(self, script):
        return subprocess.run(
            ["node", "--input-type=module", "--eval", script],
            capture_output=True,
            text=True,
        )

    def test_disabled_shared_setting_is_reported_before_deployment(self):
        module = (PREVIEW / "check-worker-preview.mjs").as_uri()
        result = self.run_module(
            f"""
              import {{ validatePreviewSettings }} from {module!r};
              validatePreviewSettings({{ success: true, result: {{ enabled: false, previews_enabled: false }} }});
            """,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("expected workers_dev=false and preview_urls=true", result.stderr)

    def test_expected_shared_setting_is_accepted(self):
        module = (PREVIEW / "check-worker-preview.mjs").as_uri()
        result = self.run_module(
            f"""
              import {{ validatePreviewSettings }} from {module!r};
              validatePreviewSettings({{ success: true, result: {{ enabled: false, previews_enabled: true }} }});
            """,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_pages_url_comes_from_structured_output_not_the_project_name(self):
        module = (PREVIEW / "read-pages-output.mjs").as_uri()
        output = '{"type":"pages-deploy-detailed","pages_project":"calwise","environment":"preview","alias":"https://pr-18.calwise-auf.pages.dev"}'
        result = self.run_module(
            f"""
              import {{ getPagesAliasUrl }} from {module!r};
              const url = getPagesAliasUrl({output!r}, 'pr-18');
              if (url !== 'https://pr-18.calwise-auf.pages.dev') throw new Error(url);
            """,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_structured_wrangler_output_requires_a_real_alias_url(self):
        module = (PREVIEW / "read-version-output.mjs").as_uri()
        missing_url = '{"type":"version-upload","worker_name":"calwise-api","version_id":"315d20b7-dc62-400f-b20d-16eb61207c0a","preview_alias_url":null}'
        result = self.run_module(
            f"""
              import {{ getPreviewAliasUrl }} from {module!r};
              getPreviewAliasUrl({missing_url!r}, 'pr-18');
            """,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("did not create an aliased preview URL", result.stderr)

        valid_url = '{"type":"version-upload","worker_name":"calwise-api","preview_alias_url":"https://pr-18-calwise-api.example.workers.dev"}'
        result = self.run_module(
            f"""
              import {{ getPreviewAliasUrl }} from {module!r};
              const url = getPreviewAliasUrl({valid_url!r}, 'pr-18');
              if (url !== 'https://pr-18-calwise-api.example.workers.dev') throw new Error(url);
            """,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


class PreviewDataTest(unittest.TestCase):
    def test_food_fixture_is_synthetic_and_idempotent(self):
        database = sqlite3.connect(":memory:")
        for migration in sorted((ROOT / "packages" / "database" / "migrations-food").glob("*/migration.sql")):
            database.executescript(migration.read_text())
        fixture = (PREVIEW / "food-fixtures.sql").read_text()
        database.executescript(fixture)
        database.executescript(fixture)
        rows = database.execute("SELECT barcode, source_url FROM products ORDER BY barcode").fetchall()
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(url.startswith("https://example.invalid/") for _, url in rows))


class ProductionDeployTest(unittest.TestCase):
    def test_production_code_config_bindings_and_secret_are_one_deployment(self):
        commit_sha = "0123456789abcdef0123456789abcdef01234567"
        production_secret = "production-only secret with a newline\n"
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            capture = temp / "capture"
            capture.mkdir()
            bin_dir = temp / "bin"
            bin_dir.mkdir()
            fake_pnpm = bin_dir / "pnpm"
            fake_pnpm.write_text(
                """#!/usr/bin/env python3
import json
import os
import stat
import sys
from pathlib import Path

capture = Path(os.environ["CAPTURE"])
args = sys.argv[1:]
(capture / "args.json").write_text(json.dumps(args))
secrets_path = Path(args[args.index("--secrets-file") + 1])
(capture / "secrets.json").write_text(secrets_path.read_text())
(capture / "secrets-mode").write_text(oct(stat.S_IMODE(secrets_path.stat().st_mode)))
(capture / "secrets-path").write_text(str(secrets_path))
(capture / "secret-env").write_text(str("BETTER_AUTH_SECRET" in os.environ))
""",
            )
            fake_pnpm.chmod(0o755)
            env = os.environ | {
                "BETTER_AUTH_SECRET": production_secret,
                "CAPTURE": str(capture),
                "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
            }
            subprocess.run(
                [
                    "bash",
                    str(ROOT / "tools" / "cloudflare-production" / "deploy.sh"),
                    commit_sha,
                ],
                check=True,
                env=env,
            )

            args = json.loads((capture / "args.json").read_text())
            secrets_path = (capture / "secrets-path").read_text()
            self.assertEqual(
                args[:7],
                [
                    "--dir",
                    str(ROOT),
                    "--filter",
                    "@calwise/api",
                    "exec",
                    "wrangler",
                    "deploy",
                ],
            )
            self.assertEqual(
                args[args.index("--config") + 1],
                str(ROOT / "apps" / "api" / "wrangler.jsonc"),
            )
            self.assertEqual(
                args[args.index("--message") + 1],
                f"Production at {commit_sha}",
            )
            self.assertNotIn("versions", args)
            self.assertEqual(
                json.loads((capture / "secrets.json").read_text()),
                {"BETTER_AUTH_SECRET": production_secret},
            )
            self.assertEqual((capture / "secrets-mode").read_text(), oct(stat.S_IRUSR | stat.S_IWUSR))
            self.assertEqual((capture / "secret-env").read_text(), "False")
            self.assertFalse(Path(secrets_path).exists())

    def test_production_workflow_never_edits_or_copies_the_latest_version(self):
        workflow = (ROOT / ".github" / "workflows" / "deploy-api.yml").read_text()
        self.assertIn("tools/cloudflare-production/deploy.sh", workflow)
        self.assertNotIn("wrangler secret", workflow)
        self.assertNotIn("versions secret", workflow)
        self.assertNotIn("versions deploy", workflow)
        checks = (ROOT / ".github" / "workflows" / "checks.yml").read_text()
        self.assertIn("tools/cloudflare-production/**", checks)

        production_config = (ROOT / "apps" / "api" / "wrangler.jsonc").read_text()
        self.assertIn('"pattern": "calwise-api.lastlab.win"', production_config)
        self.assertIn('"database_name": "calwise"', production_config)
        self.assertIn('"database_name": "calwise-food"', production_config)
        self.assertNotIn("pr-${", production_config)


class PreviewWorkflowTest(unittest.TestCase):
    def test_deploy_waits_for_checks_and_rejects_forks(self):
        workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text()
        self.assertIn("deploy-preview:\n    needs: checks", workflow)
        self.assertIn("head.repo.full_name == github.repository", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        self.assertNotIn("pull_request_target", workflow)

    def test_cleanup_uses_trusted_code_and_shared_serialization_key(self):
        deploy = (ROOT / ".github" / "workflows" / "deploy-preview.yml").read_text()
        cleanup = (ROOT / ".github" / "workflows" / "cleanup-preview.yml").read_text()
        self.assertIn("group: preview-pr-${{ inputs.pull_request_number }}", deploy)
        self.assertIn("group: preview-pr-${{ github.event.pull_request.number }}", cleanup)
        self.assertIn("ref: ${{ github.event.repository.default_branch }}", cleanup)
        self.assertNotIn("pull_request_target", cleanup)

    def test_preview_worker_config_has_no_production_routes(self):
        deploy_script = (PREVIEW / "deploy.sh").read_text()
        config_start = deploy_script.index("jq -n")
        config_end = deploy_script.index(" >\"$config\"", config_start)
        generated_config = deploy_script[config_start:config_end]
        self.assertIn("preview_urls: true", generated_config)
        self.assertIn("workers_dev: false", generated_config)
        self.assertNotIn("routes:", generated_config)
        self.assertNotIn("calwise-api.lastlab.win", generated_config)

    def test_shared_setting_preflight_runs_before_database_work(self):
        deploy_script = (PREVIEW / "deploy.sh").read_text()
        self.assertLess(
            deploy_script.index("check-worker-preview.mjs"),
            deploy_script.index("user_database_id=$(ensure_database"),
        )
        self.assertNotIn("triggers deploy", deploy_script)
        self.assertNotIn(".calwise.pages.dev", deploy_script)
        self.assertIn("read-pages-output.mjs", deploy_script)


if __name__ == "__main__":
    unittest.main()
