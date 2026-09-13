import {
  personalProductDraftToCreateValues,
  type PersonalProductDraft,
  type PersonalProductDraftErrors,
  type PersonalProductDraftField,
} from "@calwise/food-rules/personal-product";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Barcode, CircleAlert, ScanBarcode } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router";
import { BottomSheet } from "../components/bottom-sheet";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { nutritionFormat } from "../lib/number-format";
import { useTRPC } from "../lib/trpc";
import { useLogDestination } from "../modules/food-log/destination";
import { ProductIdentity } from "../modules/food/product-details";
import { BarcodeScanner } from "../modules/scanner/barcode-scanner";

type FieldName = PersonalProductDraftField;
type Draft = PersonalProductDraft;
type Errors = PersonalProductDraftErrors;

const emptyDraft: Draft = {
  name: "",
  brand: "",
  barcode: "",
  packageQuantity: "",
  servingSize: "",
  nutritionBasis: "g",
  energyKcal100: "",
  energyKj100: "",
  protein100: "",
  carbohydrates100: "",
  fat100: "",
  saturatedFat100: "",
  sugars100: "",
  fiber100: "",
  salt100: "",
  sodium100: "",
};

const nutritionFields = [
  ["energyKcal100", "Calories", "kcal", true],
  ["protein100", "Protein", "g", true],
  ["carbohydrates100", "Carbohydrates", "g", true],
  ["fat100", "Fat", "g", true],
  ["energyKj100", "Energy", "kJ", false],
  ["saturatedFat100", "Saturated fat", "g", false],
  ["sugars100", "Sugars", "g", false],
  ["fiber100", "Fibre", "g", false],
  ["salt100", "Salt", "g", false],
  ["sodium100", "Sodium", "g", false],
] as const;

export default function CreateProductPage() {
  const [params] = useSearchParams();
  const initialDraft = useMemo(
    () => ({
      ...emptyDraft,
      name: params.get("name") ?? "",
      barcode: params.get("barcode") ?? "",
    }),
    [params],
  );
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Errors>({});
  const [scanning, setScanning] = useState(false);
  const [existingProductId, setExistingProductId] = useState<string | null>(null);
  const destination = useLogDestination();
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const leaving = useRef(false);
  const request = useRef<{ payload: string; id: string } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(emptyDraft);
  const blocker = useBlocker(() => dirty && !leaving.current);
  const save = useMutation(trpc.food.personalCreate.mutationOptions());
  const existing = useQuery({
    ...trpc.food.personalGet.queryOptions({
      id: existingProductId ?? "00000000-0000-4000-8000-000000000000",
    }),
    enabled: existingProductId !== null,
    retry: false,
  });

  useEffect(() => {
    if (!params.has("barcode") && !params.has("name")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("barcode");
    url.searchParams.delete("name");
    window.history.replaceState(window.history.state, "", url);
  }, [params]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(field: FieldName, value: string) {
    if (save.isPending) return;
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (save.isError) save.reset();
  }

  function updateBasis(nutritionBasis: Draft["nutritionBasis"]) {
    if (save.isPending) return;
    setDraft((current) => ({ ...current, nutritionBasis }));
    if (save.isError) save.reset();
  }

  function goBack() {
    if (step === 2) {
      setStep(1);
      return;
    }
    leaveForMyFoods();
  }

  function leaveForMyFoods() {
    const next = new URLSearchParams({ date: destination.date });
    if (destination.meal) next.set("meal", destination.meal);
    void navigate(`/my-foods?${next}`);
  }

  function nextStep(event: FormEvent) {
    event.preventDefault();
    const result = personalProductDraftToCreateValues(draft);
    const detailFields = ["name", "brand", "barcode", "packageQuantity", "servingSize"] as const;
    const nextErrors = result.ok
      ? {}
      : Object.fromEntries(
          detailFields.flatMap((field) =>
            result.errors[field] ? [[field, result.errors[field]]] : [],
          ),
        );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep(2);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = personalProductDraftToCreateValues(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    const payload = result.input;
    const serialized = JSON.stringify(payload);
    const activeRequest =
      request.current?.payload === serialized
        ? request.current
        : { payload: serialized, id: crypto.randomUUID() };
    request.current = activeRequest;
    save.mutate(
      { requestId: activeRequest.id, ...payload },
      {
        onSuccess: ({ product }) => {
          leaving.current = true;
          void cache.invalidateQueries(trpc.food.personalList.pathFilter());
          void cache.invalidateQueries(trpc.food.barcode.pathFilter());
          const next = new URLSearchParams({ date: destination.date });
          if (destination.meal) next.set("meal", destination.meal);
          void navigate(`/my-foods?${next}`, {
            replace: true,
            state: { createdName: product.name, selectedProductId: product.id },
          });
        },
      },
    );
  }

  const conflict = save.error?.data?.conflict;

  return (
    <div className="flex min-h-[calc(100dvh-40px)] flex-col gap-4">
      <header className="flex h-11 items-center gap-3.5">
        <IconButton
          aria-label={step === 1 ? "Back to My foods" : "Back to product details"}
          onClick={goBack}
          disabled={save.isPending}
        >
          <ArrowLeft size={21} aria-hidden="true" />
        </IconButton>
        <h1 className="font-display text-30 font-bold italic">CREATE PRODUCT</h1>
      </header>
      <p className="text-11 font-semibold text-lime">
        STEP {step} OF 2 · {step === 1 ? "PRODUCT DETAILS" : "NUTRITION"}
      </p>
      {step === 1 ? (
        <form className="flex flex-1 flex-col gap-4" onSubmit={nextStep} noValidate>
          <TextField
            field="name"
            label="Product name"
            value={draft.name}
            error={errors.name}
            required
            disabled={save.isPending}
            onChange={update}
          />
          <TextField
            field="brand"
            label="Brand (optional)"
            value={draft.brand}
            error={errors.brand}
            disabled={save.isPending}
            onChange={update}
          />
          <TextField
            field="barcode"
            label="Barcode (optional)"
            value={draft.barcode}
            error={errors.barcode}
            inputMode="numeric"
            disabled={save.isPending}
            onChange={update}
            trailing={
              <button
                type="button"
                aria-label="Open barcode scanner"
                disabled={save.isPending}
                onClick={() => setScanning(true)}
                className="flex size-11 shrink-0 items-center justify-center text-lime"
              >
                <ScanBarcode size={21} aria-hidden="true" />
              </button>
            }
          />
          <TextField
            field="packageQuantity"
            label="Package quantity (optional)"
            placeholder="e.g. 1 L or 500 g"
            value={draft.packageQuantity}
            error={errors.packageQuantity}
            disabled={save.isPending}
            onChange={update}
          />
          <TextField
            field="servingSize"
            label="Serving size (optional)"
            placeholder="e.g. 250 ml or 1 slice (30 g)"
            value={draft.servingSize}
            error={errors.servingSize}
            disabled={save.isPending}
            onChange={update}
          />
          <p className="text-11 leading-relaxed text-muted">
            Product name is required. Add a barcode only when the product has one.
          </p>
          <div className="sticky bottom-0 mt-auto bg-bg pt-3 pb-2">
            <PrimaryAction type="submit" size="compact">
              NEXT: NUTRITION
            </PrimaryAction>
          </div>
        </form>
      ) : (
        <form className="flex flex-1 flex-col gap-4" onSubmit={submit} noValidate>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-11 font-bold tracking-[1px]">VALUES FROM THE LABEL</legend>
            <div className="grid grid-cols-2 rounded-8 border border-line bg-surface p-1">
              {(["g", "ml"] as const).map((basis) => (
                <button
                  key={basis}
                  type="button"
                  role="radio"
                  aria-checked={draft.nutritionBasis === basis}
                  aria-label={`Per 100 ${basis}`}
                  disabled={save.isPending}
                  onClick={() => updateBasis(basis)}
                  className={`h-9 rounded-8 text-12 font-semibold ${
                    draft.nutritionBasis === basis ? "bg-lime text-bg" : "text-muted"
                  }`}
                >
                  Per 100 {basis}
                </button>
              ))}
            </div>
            <p className="text-11 leading-relaxed text-muted">
              Changing the basis keeps every value as entered. No conversion occurs.
            </p>
          </fieldset>
          <p className="text-12 text-muted">
            Calories, protein, carbohydrates and fat are required.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {nutritionFields.slice(0, 4).map(([field, label, unit, required]) => (
              <NutritionField
                key={field}
                field={field}
                label={label}
                unit={unit}
                required={required}
                value={draft[field]}
                error={errors[field]}
                disabled={save.isPending}
                onChange={update}
              />
            ))}
            <h2 className="col-span-2 mt-2 text-11 font-bold tracking-[1px] text-muted">
              OPTIONAL NUTRIENTS
            </h2>
            {nutritionFields.slice(4).map(([field, label, unit, required]) => (
              <NutritionField
                key={field}
                field={field}
                label={label}
                unit={unit}
                required={required}
                value={draft[field]}
                error={errors[field]}
                disabled={save.isPending}
                onChange={update}
              />
            ))}
          </div>
          <p className="text-11 text-muted">Blank optional values stay unknown, not zero.</p>
          {save.isError && conflict?.kind === "DUPLICATE_BARCODE" && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-10 border border-danger/50 p-3 text-12"
            >
              <p className="text-danger">You already have a personal product with this barcode.</p>
              {conflict.existingProductId && (
                <button
                  type="button"
                  onClick={() => setExistingProductId(conflict.existingProductId ?? null)}
                  className="min-h-11 self-start text-lime"
                >
                  View existing product
                </button>
              )}
              <p className="text-muted">
                Your draft is unchanged. Correct or remove the barcode to save it separately.
              </p>
            </div>
          )}
          {save.isError && conflict?.kind !== "DUPLICATE_BARCODE" && (
            <div role="alert" className="flex items-start gap-2 text-12 text-danger">
              <CircleAlert size={18} className="shrink-0" aria-hidden="true" />
              {conflict?.kind === "IDEMPOTENCY_KEY_REUSED"
                ? "This save request no longer matches the draft. Change a field and try again."
                : "Could not save this product. Your draft is intact. Try again."}
            </div>
          )}
          <div className="sticky bottom-0 mt-auto flex gap-3 bg-bg pt-3 pb-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={save.isPending}
              className="h-[50px] min-w-24 rounded-10 border border-line bg-surface text-12 font-semibold"
            >
              BACK
            </button>
            <PrimaryAction type="submit" size="compact" disabled={save.isPending}>
              {save.isPending ? "SAVING…" : "SAVE PRODUCT"}
            </PrimaryAction>
          </div>
        </form>
      )}
      {scanning && (
        <BottomSheet
          title="SCAN BARCODE"
          onClose={() => setScanning(false)}
          closeLabel="Close barcode scanner"
        >
          <div className="flex flex-col gap-4">
            <BarcodeScanner
              onScan={(code) => {
                update("barcode", code);
                setScanning(false);
              }}
            />
            <p className="text-center text-12 text-muted">
              Completing or cancelling barcode capture keeps the rest of your draft.
            </p>
            <button type="button" onClick={() => setScanning(false)} className="min-h-11 text-lime">
              Cancel barcode scanning
            </button>
          </div>
        </BottomSheet>
      )}
      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 sm:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-product-title"
            aria-describedby="discard-product-description"
            className="m-5 flex w-full max-w-sm flex-col gap-4 rounded-20 border border-line bg-bg p-5"
          >
            <h2 id="discard-product-title" className="font-display text-24 font-bold italic">
              DISCARD PRODUCT?
            </h2>
            <p id="discard-product-description" className="text-13 leading-relaxed text-muted">
              Your unsaved product details will be lost.
            </p>
            <PrimaryAction size="compact" onClick={() => blocker.reset()}>
              KEEP EDITING
            </PrimaryAction>
            <button
              type="button"
              onClick={() => {
                leaving.current = true;
                blocker.proceed();
              }}
              className="min-h-11 text-12 text-danger"
            >
              Discard changes
            </button>
          </div>
        </div>
      )}
      {existingProductId && (
        <BottomSheet
          title="EXISTING PRODUCT"
          onClose={() => setExistingProductId(null)}
          closeLabel="Back to draft"
        >
          {existing.isPending && (
            <p role="status" className="py-8 text-center text-muted">
              Loading product…
            </p>
          )}
          {existing.isError && (
            <p role="alert" className="py-8 text-danger">
              Could not load the existing product.
            </p>
          )}
          {existing.data && (
            <div className="flex flex-col gap-4">
              <ProductIdentity product={existing.data.product} />
              <p className="text-12 text-muted">
                {nutritionFormat.format(existing.data.product.energyKcal100)} kcal per 100{" "}
                {existing.data.product.nutritionBasis}
              </p>
              <p className="text-12 text-muted">
                <Barcode size={18} className="mr-2 inline text-lime" aria-hidden="true" />
                {existing.data.product.barcode}
              </p>
              <button
                type="button"
                onClick={() => setExistingProductId(null)}
                className="min-h-11 text-lime"
              >
                Back to draft
              </button>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

function TextField({
  field,
  label,
  value,
  error,
  required = false,
  placeholder,
  inputMode,
  trailing,
  disabled = false,
  onChange,
}: {
  readonly field: FieldName;
  readonly label: string;
  readonly value: string;
  readonly error?: string | undefined;
  readonly required?: boolean | undefined;
  readonly placeholder?: string | undefined;
  readonly inputMode?: "text" | "numeric" | undefined;
  readonly trailing?: ReactNode;
  readonly disabled?: boolean | undefined;
  readonly onChange: (field: FieldName, value: string) => void;
}) {
  const errorId = `${field}-error`;
  return (
    <label className="flex flex-col gap-2 text-12 font-medium">
      {label}
      <span className="flex h-11 items-center rounded-8 border border-line bg-surface px-3 focus-within:border-lime">
        <input
          name={field}
          aria-label={label}
          value={value}
          required={required}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
        />
        {trailing}
      </span>
      {error && (
        <span id={errorId} role="alert" className="text-11 text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function NutritionField({
  field,
  label,
  unit,
  value,
  error,
  required,
  disabled = false,
  onChange,
}: {
  readonly field: FieldName;
  readonly label: string;
  readonly unit: string;
  readonly value: string;
  readonly error?: string | undefined;
  readonly required: boolean;
  readonly disabled?: boolean | undefined;
  readonly onChange: (field: FieldName, value: string) => void;
}) {
  const errorId = `${field}-error`;
  return (
    <label className="flex min-w-0 flex-col gap-2 text-11 font-medium">
      <span>
        {label}
        {required ? "" : " (optional)"}
      </span>
      <span className="flex h-11 items-center rounded-8 border border-line bg-surface px-3 focus-within:border-lime">
        <input
          name={field}
          aria-label={required ? label : `${label} (optional)`}
          value={value}
          required={required}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(field, event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        <span className="text-11 text-muted">{unit}</span>
      </span>
      {error && (
        <span id={errorId} role="alert" className="text-10 text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
