import { toggleOrgRole, type OrgRoleId, ORG_ROLE_OPTIONS } from '../utils/orgRoles'
import './OrgProfileFields.css'

type Props = {
  orgRoles: string[]
  onOrgRolesChange: (roles: OrgRoleId[]) => void
  direction: string
  onDirectionChange: (value: string) => void
  isTechnical: boolean
  onTechnicalChange: (value: boolean) => void
}

export function OrgProfileFields({
  orgRoles,
  onOrgRolesChange,
  direction,
  onDirectionChange,
  isTechnical,
  onTechnicalChange,
}: Props) {
  const selected = new Set(orgRoles)

  return (
    <>
      <div className="form-group">
        <label>Роль</label>
        <div className="org-role-checks">
          {ORG_ROLE_OPTIONS.map((item) => (
            <label key={item.id} className="org-check">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onOrgRolesChange(toggleOrgRole(orgRoles, item.id))}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <small>Можно выбрать несколько</small>
      </div>

      <div className="form-group">
        <label>Направление</label>
        <input
          type="text"
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value)}
          placeholder="Например, backend или обучение"
        />
      </div>

      <div className="form-group">
        <label className="org-check org-check--block">
          <input
            type="checkbox"
            checked={isTechnical}
            onChange={(e) => onTechnicalChange(e.target.checked)}
          />
          <span>Технический аккаунт</span>
        </label>
        <small>Не показывается в контактах почты</small>
      </div>
    </>
  )
}
