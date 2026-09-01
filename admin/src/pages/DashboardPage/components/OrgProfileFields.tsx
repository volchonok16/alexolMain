import { toggleOrgRole, type OrgRoleId, ORG_ROLE_OPTIONS } from '@/utils/orgRoles';
import './OrgProfileFields.scss';

type OrgProfileFieldsProps = {
  orgRoles: string[];
  onOrgRolesChange: (roles: OrgRoleId[]) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
  isTechnical: boolean;
  onTechnicalChange: (value: boolean) => void;
  disabled?: boolean;
};

export const OrgProfileFields = ({
  orgRoles,
  onOrgRolesChange,
  direction,
  onDirectionChange,
  isTechnical,
  onTechnicalChange,
  disabled = false,
}: OrgProfileFieldsProps) => {
  const selected = new Set(orgRoles);

  return (
    <>
      <div className="modal__field">
        <label>Роль</label>
        <div className="org-role-checks">
          {ORG_ROLE_OPTIONS.map(item => (
            <label key={item.id} className="org-check">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onOrgRolesChange(toggleOrgRole(orgRoles, item.id))}
                disabled={disabled}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <p className="modal__hint">Можно выбрать несколько: руководитель, наставник, сотрудник, обучающийся</p>
      </div>

      <div className="modal__field">
        <label>Направление</label>
        <input
          type="text"
          value={direction}
          onChange={e => onDirectionChange(e.target.value)}
          placeholder="Например, backend или обучение"
          disabled={disabled}
        />
      </div>

      <div className="modal__field">
        <label className="org-check org-check--block">
          <input
            type="checkbox"
            checked={isTechnical}
            onChange={e => onTechnicalChange(e.target.checked)}
            disabled={disabled}
          />
          <span>Технический аккаунт</span>
        </label>
        <p className="modal__hint">Не показывается в контактах почты</p>
      </div>
    </>
  );
};
