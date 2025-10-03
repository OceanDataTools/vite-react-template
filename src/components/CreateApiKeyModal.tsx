import type { SubmitHandler } from "react-hook-form"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// form validation schema
const createKeySchema = z.object({
  keyName: z.string().min(1, "Key name is required"),
  permissions: z
    .array(
      z.object({
        route: z.string(),
        method: z.string(),
      }),
    )
    .min(1, "Select at least one permission"),
})

type CreateKeyFormValues = z.infer<typeof createKeySchema>

type CreateApiKeyModalProps = {
  routes: { route: string; methods: string[]; name: string }[]
  onCreate: (data: CreateKeyFormValues) => Promise<boolean>
  formError?: string
}

const CreateApiKeyModal = ({
  routes,
  onCreate,
  formError,
}: CreateApiKeyModalProps) => {
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CreateKeyFormValues>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { keyName: "", permissions: [] },
    mode: "onChange",
  })

  const watchedPermissions = watch("permissions")

  const togglePermission = (route: string, method: string) => {
    const current = watchedPermissions
    const exists = current.find(p => p.route === route && p.method === method)
    if (exists) {
      setValue(
        "permissions",
        current.filter(p => p.route !== route || p.method !== method),
        { shouldValidate: true },
      )
    } else {
      setValue("permissions", [...current, { route, method }], {
        shouldValidate: true,
      })
    }
  }

  const onSubmit: SubmitHandler<CreateKeyFormValues> = async data => {
    const success = await onCreate(data)
    if (success) {
      reset()
      document.getElementById("create_apikey_modal")?.close()
    }
  }

  return (
    <dialog id="create_apikey_modal" className="modal">
      <form
        className="modal-box max-w-md mx-auto"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h3 className="font-bold text-xl">Create API Key</h3>

        {formError && <p className="text-error text-sm">{formError}</p>}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Key Name</legend>
          <input
            type="text"
            className="w-full border p-2 rounded"
            {...register("keyName", { required: true, minLength: 1 })}
            placeholder="Enter key name"
          />
          {errors.keyName && (
            <p className="text-error text-sm mt-1">{errors.keyName.message}</p>
          )}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Permissions</legend>
          <div className="max-h-48 overflow-auto border rounded p-2">
            {routes.map(({ route, methods, name }) => (
              <div key={name} className="mb-2">
                {methods.map(method => (
                  <label key={method} className="label cursor-pointer text-sm">
                    <Controller
                      name="permissions"
                      control={control}
                      render={() => (
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={watchedPermissions.some(
                            p => p.route === route && p.method === method,
                          )}
                          onChange={() => {
                            togglePermission(route, method)
                          }}
                        />
                      )}
                    />
                    <span className="label-text mr-2">
                      {method} {route}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          {errors.permissions && (
            <p className="text-error text-sm mt-1">
              {errors.permissions.message}
            </p>
          )}
        </fieldset>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              ;(
                document.getElementById(
                  "create_apikey_modal",
                ) as HTMLDialogElement
              ).close()
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default CreateApiKeyModal
