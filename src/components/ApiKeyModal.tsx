import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

export const createKeySchema = z.object({
  keyName: z.string().min(1),
  neverExpires: z.boolean().default(false),
  expiresAt: z.string().nullable(),
  permissions: z.array(z.object({ route: z.string(), method: z.string() })).min(1),
}).superRefine((data, ctx) => {
  const now = new Date()

  // Expiration required if neverExpires is false
  if (!data.neverExpires && !data.expiresAt) {
    ctx.addIssue({ path: ["expiresAt"], message: "Expiration is required", code: z.ZodIssueCode.custom })
  }

  // Expiration must be in the future if provided
  if (data.expiresAt) {
    const dt = new Date(data.expiresAt)
    if (dt <= now) {
      ctx.addIssue({ path: ["expiresAt"], message: "Expiration must be in the future", code: z.ZodIssueCode.custom })
    }
  }
})

export type CreateKeySubmit = z.infer<typeof createKeySchema>

type Permission = { route: string; methods: string[]; name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  initialValues?: CreateKeySubmit & { id?: string }
  mode?: "create" | "reissue"
  routes: Permission[]
  onSubmitForm: (data: CreateKeySubmit & { id?: string }) => Promise<boolean>
  formError?: string
}

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const ApiKeyModal = ({ isOpen, onClose, initialValues, mode="create", routes, onSubmitForm, formError }: Props) => {
  // Determine expiresAt for defaultValues
  const computeExpiresAt = () => {
    if (!initialValues?.expiresAt) return null
    const date = new Date(initialValues.expiresAt)
    return date > new Date() ? toDatetimeLocal(initialValues.expiresAt) : null
  }

  const defaultValues: CreateKeySubmit = {
    keyName: initialValues?.keyName ?? "",
    permissions: initialValues?.permissions ?? [],
    expiresAt: computeExpiresAt(),
    neverExpires: initialValues?.neverExpires ?? false,
  }

  const { control, register, handleSubmit, watch, setValue, reset, formState: { errors, isValid, isSubmitting } } = useForm<CreateKeySubmit>({
    defaultValues,
    resolver: zodResolver(createKeySchema),
    mode: "onChange"
  })

  const watchedPermissions = watch("permissions")
  const neverExpires = watch("neverExpires")

  // Blank out expiresAt if "Never Expires" is checked
  useEffect(() => {
    if (neverExpires) setValue("expiresAt", "", { shouldValidate: true })
  }, [neverExpires, setValue])

  const togglePermission = (route: string, method: string) => {
    if (mode === "reissue") return
    const exists = watchedPermissions.some(p => p.route===route && p.method===method)
    setValue("permissions", exists
      ? watchedPermissions.filter(p => p.route!==route || p.method!==method)
      : [...watchedPermissions, { route, method }],
      { shouldValidate: true }
    )
  }

  const onSubmit = async (values: CreateKeySubmit) => {
    const payload = { ...values, id: initialValues?.id }
    const success = await onSubmitForm(payload)
    if (success) { reset(defaultValues); onClose() }
  }

  if (!isOpen) return null

  return (
    <dialog className="modal" open>
      <form className="modal-box max-w-md mx-auto" onSubmit={handleSubmit(onSubmit)}>
        <h3 className="font-bold text-xl">{mode==="create"?"Create API Key":"Re-Issue API Key"}</h3>
        {formError && <p className="text-error text-sm">{formError}</p>}

        {/* Key Name */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Key Name</legend>
          <input type="text" className="w-full border p-2 rounded" {...register("keyName")} readOnly={mode==="reissue"} />
          {errors.keyName && <p className="text-error text-sm mt-1">{errors.keyName.message}</p>}
        </fieldset>

        {/* Expires At */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Expires At</legend>
          <label className="label cursor-pointer mb-1">
            <input type="checkbox" className="checkbox checkbox-sm" {...register("neverExpires")} />
            <span className="label-text ml-2">Never expires</span>
          </label>
          <input type="date"
            className="w-full border p-2 rounded"
            {...register("expiresAt")}
            readOnly={neverExpires}
          />
        </fieldset>

        {/* Permissions */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Permissions</legend>
          {mode==="reissue" && <p className="text-xs text-gray-500 mb-2">Permissions cannot be changed.</p>}
          <div className="max-h-48 overflow-auto border rounded p-2">
            {routes.map(({ route, methods, name }) => (
              <div key={name} className="mb-2">
                {methods.map(method => (
                  <label key={method} className="label cursor-pointer text-sm">
                    <Controller
                      name="permissions"
                      control={control}
                      render={() => (
                        <input type="checkbox" className="checkbox checkbox-sm"
                          checked={watchedPermissions.some(p => p.route===route && p.method===method)}
                          onChange={() => togglePermission(route, method)}
                          disabled={mode==="reissue"}
                        />
                      )}
                    />
                    <span className="label-text mr-2">{method} {route}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="modal-action">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { reset(defaultValues); onClose() }}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Saving..." : mode==="create"?"Create":"Re-Issue"}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default ApiKeyModal
