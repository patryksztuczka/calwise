import sqlite3
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


if __name__ == "__main__":
    unittest.main()
