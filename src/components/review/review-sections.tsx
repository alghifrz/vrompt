import type {
  AIRule,
  ActivationMode,
  ApiEndpoint,
  Feature,
  HttpMethod,
  Priority,
  ProjectSpec,
  UserType,
} from "../../core/schema/project-spec";
import {
  fieldError,
  moveItem,
  nextReviewId,
  removeItem,
  replaceItem,
  type ReviewFieldError,
} from "../../lib/review/view-model";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ghostButtonClass,
  IconButton,
  itemCardClass,
  SelectField,
  StringList,
  TextArea,
  TextInput,
  TrashIcon,
} from "./form-controls";
import { ReviewSection } from "./review-section";

const PRIORITY_OPTIONS = [
  { value: "must", label: "Must" },
  { value: "should", label: "Should" },
  { value: "later", label: "Later" },
] as const;

const FEATURE_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "approved", label: "Approved" },
  { value: "implemented", label: "Implemented" },
] as const;

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const ACTIVATION_MODES: { value: ActivationMode; label: string }[] = [
  { value: "always", label: "Always" },
  { value: "scoped", label: "Scoped" },
  { value: "agent_decides", label: "Agent decides" },
  { value: "manual", label: "Manual" },
];

export function ReviewSections({
  spec,
  disabled,
  errors,
  onChange,
}: {
  spec: ProjectSpec;
  disabled: boolean;
  errors?: readonly ReviewFieldError[];
  onChange: (spec: ProjectSpec) => void;
}) {
  return (
    <div className="space-y-4">
      <ProjectSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <GoalsSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <FeaturesSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <UsersSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <StackSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <ArchitectureSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <DatabaseSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <ApiSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <SecuritySection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <ConstraintsSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
      <AiRulesSection spec={spec} disabled={disabled} errors={errors} onChange={onChange} />
    </div>
  );
}

function ProjectSection({
  spec,
  disabled,
  errors,
  onChange,
}: SectionProps) {
  const project = spec.project;

  return (
    <ReviewSection title="Project" defaultOpen>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="project-name"
          label="Name"
          value={project.name}
          disabled={disabled}
          error={fieldError(errors, "project.name")}
          onChange={(name) => onChange({ ...spec, project: { ...project, name } })}
        />
        <TextInput
          id="project-type"
          label="Type"
          value={project.type}
          disabled={disabled}
          error={fieldError(errors, "project.type")}
          onChange={(type) => onChange({ ...spec, project: { ...project, type } })}
        />
      </div>
      <TextArea
        id="project-description"
        label="Description"
        value={project.description}
        disabled={disabled}
        error={fieldError(errors, "project.description")}
        onChange={(description) =>
          onChange({ ...spec, project: { ...project, description } })
        }
      />
      <TextArea
        id="project-problem"
        label="Problem"
        value={project.problem}
        disabled={disabled}
        error={fieldError(errors, "project.problem")}
        onChange={(problem) => onChange({ ...spec, project: { ...project, problem } })}
      />
      <StringList
        id="project-target-users"
        label="Target users"
        items={project.targetUsers}
        disabled={disabled}
        addLabel="Add target user"
        onChange={(targetUsers) =>
          onChange({ ...spec, project: { ...project, targetUsers } })
        }
      />
      <SelectField
        id="project-status"
        label="Status"
        value={project.status}
        disabled={disabled}
        options={[
          { value: "draft", label: "Draft" },
          { value: "ready", label: "Ready" },
          { value: "archived", label: "Archived" },
        ]}
        onChange={(status) =>
          onChange({
            ...spec,
            project: {
              ...project,
              status: status as ProjectSpec["project"]["status"],
            },
          })
        }
      />
    </ReviewSection>
  );
}

function GoalsSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.goals) {
    return (
      <ReviewSection title="Goals" defaultOpen>
        <EmptySection
          text="No goals have been captured yet."
          action="Add goals"
          disabled={disabled}
          onAdd={() =>
            onChange({ ...spec, goals: { primary: [], successCriteria: [] } })
          }
        />
      </ReviewSection>
    );
  }

  return (
    <ReviewSection title="Goals" defaultOpen>
      <div className="space-y-4">
        {spec.goals.primary.map((goal, index) => (
          <div key={goal.id} className={itemCardClass}>
            <TextArea
              id={`goal-${goal.id}`}
              label={`Primary goal ${String(index + 1)}`}
              value={goal.statement}
              disabled={disabled}
              error={fieldError(errors, `goals.primary.${String(index)}.statement`)}
              onChange={(statement) =>
                onChange({
                  ...spec,
                  goals: {
                    ...spec.goals!,
                    primary: replaceItem(spec.goals!.primary, index, {
                      ...goal,
                      statement,
                    }),
                  },
                })
              }
            />
            <ItemControls
              label={`goal ${String(index + 1)}`}
              index={index}
              last={index === spec.goals!.primary.length - 1}
              disabled={disabled}
              onMove={(offset) =>
                onChange({
                  ...spec,
                  goals: {
                    ...spec.goals!,
                    primary: moveItem(spec.goals!.primary, index, offset),
                  },
                })
              }
              onDelete={() =>
                onChange({
                  ...spec,
                  goals: {
                    ...spec.goals!,
                    primary: removeItem(spec.goals!.primary, index),
                  },
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          disabled={disabled}
          className={ghostButtonClass}
          onClick={() =>
            onChange({
              ...spec,
              goals: {
                ...spec.goals!,
                primary: [
                  ...spec.goals!.primary,
                  { id: nextReviewId("goal"), statement: "" },
                ],
              },
            })
          }
        >
          Add goal
        </button>
        <StringList
          id="success-criteria"
          label="Success criteria"
          items={spec.goals.successCriteria}
          disabled={disabled}
          addLabel="Add success criterion"
          onChange={(successCriteria) =>
            onChange({
              ...spec,
              goals: { ...spec.goals!, successCriteria },
            })
          }
        />
        <button
          type="button"
          disabled={disabled}
          className={ghostButtonClass}
          onClick={() => {
            const next = { ...spec };
            delete next.goals;
            onChange(next);
          }}
        >
          Remove goals
        </button>
      </div>
    </ReviewSection>
  );
}

function FeaturesSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.features) {
    return (
      <ReviewSection title="Features" defaultOpen>
        <EmptySection
          text="No features have been captured yet."
          action="Add features"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, features: [] })}
        />
      </ReviewSection>
    );
  }

  return (
    <ReviewSection title="Features" defaultOpen>
      {spec.features.map((feature, index) => (
        <article key={feature.id} className={itemCardClass}>
          <h3 className="text-sm font-medium">Feature {String(index + 1)}</h3>
          <TextInput
            id={`${feature.id}-name`}
            label="Name"
            value={feature.name}
            disabled={disabled}
            error={fieldError(errors, `features.${String(index)}.name`)}
            onChange={(name) =>
              updateFeatures(spec, onChange, index, { ...feature, name })
            }
          />
          <TextArea
            id={`${feature.id}-description`}
            label="Description"
            value={feature.description}
            disabled={disabled}
            error={fieldError(errors, `features.${String(index)}.description`)}
            onChange={(description) =>
              updateFeatures(spec, onChange, index, { ...feature, description })
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`${feature.id}-priority`}
              label="Priority"
              value={feature.priority}
              disabled={disabled}
              options={PRIORITY_OPTIONS}
              onChange={(priority) =>
                updateFeatures(spec, onChange, index, {
                  ...feature,
                  priority: priority as Priority,
                })
              }
            />
            <SelectField
              id={`${feature.id}-status`}
              label="Status"
              value={feature.status}
              disabled={disabled}
              options={FEATURE_STATUS_OPTIONS}
              onChange={(status) =>
                updateFeatures(spec, onChange, index, {
                  ...feature,
                  status: status as Feature["status"],
                })
              }
            />
          </div>
          <StringList
            id={`${feature.id}-criteria`}
            label="Acceptance criteria"
            items={feature.acceptanceCriteria}
            disabled={disabled}
            addLabel="Add acceptance criterion"
            onChange={(acceptanceCriteria) =>
              updateFeatures(spec, onChange, index, {
                ...feature,
                acceptanceCriteria,
              })
            }
          />
          <ItemControls
            label={`feature ${String(index + 1)}`}
            index={index}
            last={index === spec.features!.length - 1}
            disabled={disabled}
            onMove={(offset) =>
              onChange({
                ...spec,
                features: moveItem(spec.features!, index, offset),
              })
            }
            onDelete={() =>
              onChange({
                ...spec,
                features: removeItem(spec.features!, index),
              })
            }
          />
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            features: [
              ...spec.features!,
              {
                id: nextReviewId("feature"),
                name: "",
                description: "",
                priority: "must",
                status: "planned",
                acceptanceCriteria: [],
              },
            ],
          })
        }
      >
        Add feature
      </button>
    </ReviewSection>
  );
}

function UsersSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.users) {
    return (
      <ReviewSection title="Users">
        <EmptySection
          text="No user types have been captured yet."
          action="Add users"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, users: [] })}
        />
      </ReviewSection>
    );
  }

  return (
    <ReviewSection title="Users">
      {spec.users.map((user, index) => (
        <article key={user.id} className={itemCardClass}>
          <h3 className="text-sm font-medium">User {String(index + 1)}</h3>
          <TextInput
            id={`${user.id}-name`}
            label="Name"
            value={user.name}
            disabled={disabled}
            error={fieldError(errors, `users.${String(index)}.name`)}
            onChange={(name) => updateUsers(spec, onChange, index, { ...user, name })}
          />
          <TextArea
            id={`${user.id}-description`}
            label="Description"
            value={user.description}
            disabled={disabled}
            error={fieldError(errors, `users.${String(index)}.description`)}
            onChange={(description) =>
              updateUsers(spec, onChange, index, { ...user, description })
            }
          />
          <StringList
            id={`${user.id}-goals`}
            label="Goals"
            items={user.goals}
            disabled={disabled}
            addLabel="Add user goal"
            onChange={(goals) => updateUsers(spec, onChange, index, { ...user, goals })}
          />
          <StringList
            id={`${user.id}-permissions`}
            label="Permissions"
            items={user.permissions}
            disabled={disabled}
            addLabel="Add permission"
            onChange={(permissions) =>
              updateUsers(spec, onChange, index, { ...user, permissions })
            }
          />
          <ItemControls
            label={`user ${String(index + 1)}`}
            index={index}
            last={index === spec.users!.length - 1}
            disabled={disabled}
            onMove={(offset) =>
              onChange({ ...spec, users: moveItem(spec.users!, index, offset) })
            }
            onDelete={() =>
              onChange({ ...spec, users: removeItem(spec.users!, index) })
            }
          />
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            users: [
              ...spec.users!,
              {
                id: nextReviewId("user"),
                name: "",
                description: "",
                goals: [],
                permissions: [],
              },
            ],
          })
        }
      >
        Add user
      </button>
    </ReviewSection>
  );
}

function StackSection({ spec, disabled, onChange }: SectionProps) {
  if (!spec.stack) {
    return (
      <ReviewSection title="Technology Stack">
        <EmptySection
          text="No technology stack yet."
          action="Add stack details"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, stack: {} })}
        />
      </ReviewSection>
    );
  }

  const stack = spec.stack;
  return (
    <ReviewSection title="Technology Stack">
      <TextInput
        id="stack-frontend"
        label="Frontend"
        value={stack.frontend ?? ""}
        disabled={disabled}
        onChange={(frontend) =>
          onChange({ ...spec, stack: optionalText(stack, "frontend", frontend) })
        }
      />
      <TextInput
        id="stack-backend"
        label="Backend"
        value={stack.backend ?? ""}
        disabled={disabled}
        onChange={(backend) =>
          onChange({ ...spec, stack: optionalText(stack, "backend", backend) })
        }
      />
      <TextInput
        id="stack-database"
        label="Database"
        value={stack.database ?? ""}
        disabled={disabled}
        onChange={(database) =>
          onChange({ ...spec, stack: optionalText(stack, "database", database) })
        }
      />
      <TextInput
        id="stack-authentication"
        label="Authentication"
        value={stack.authentication ?? ""}
        disabled={disabled}
        onChange={(authentication) =>
          onChange({
            ...spec,
            stack: optionalText(stack, "authentication", authentication),
          })
        }
      />
      <TextInput
        id="stack-hosting"
        label="Hosting"
        value={stack.hosting ?? ""}
        disabled={disabled}
        onChange={(hosting) =>
          onChange({ ...spec, stack: optionalText(stack, "hosting", hosting) })
        }
      />
      <StringList
        id="stack-additional"
        label="Additional"
        items={stack.additional ?? []}
        disabled={disabled}
        addLabel="Add additional technology"
        onChange={(additional) =>
          onChange({
            ...spec,
            stack: {
              ...stack,
              additional: additional.length > 0 ? additional : undefined,
            },
          })
        }
      />
    </ReviewSection>
  );
}

function ArchitectureSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.architecture) {
    return (
      <ReviewSection title="Architecture">
        <EmptySection
          text="No architecture specification yet."
          action="Add architecture details"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, architecture: {} })}
        />
      </ReviewSection>
    );
  }

  const architecture = spec.architecture;
  return (
    <ReviewSection title="Architecture">
      <TextInput
        id="architecture-style"
        label="Style"
        value={architecture.style ?? ""}
        disabled={disabled}
        onChange={(style) =>
          onChange({
            ...spec,
            architecture: optionalText(architecture, "style", style),
          })
        }
      />
      {(architecture.components ?? []).map((component, index) => (
        <article key={component.id} className={itemCardClass}>
          <TextInput
            id={`${component.id}-name`}
            label={`Component ${String(index + 1)} name`}
            value={component.name}
            disabled={disabled}
            error={fieldError(errors, `architecture.components.${String(index)}.name`)}
            onChange={(name) =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  components: replaceItem(architecture.components ?? [], index, {
                    ...component,
                    name,
                  }),
                },
              })
            }
          />
          <TextArea
            id={`${component.id}-description`}
            label="Description"
            value={component.description}
            disabled={disabled}
            onChange={(description) =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  components: replaceItem(architecture.components ?? [], index, {
                    ...component,
                    description,
                  }),
                },
              })
            }
          />
          <ItemControls
            label={`component ${String(index + 1)}`}
            index={index}
            last={index === (architecture.components ?? []).length - 1}
            disabled={disabled}
            onMove={(offset) =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  components: moveItem(architecture.components ?? [], index, offset),
                },
              })
            }
            onDelete={() =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  components: removeItem(architecture.components ?? [], index),
                },
              })
            }
          />
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            architecture: {
              ...architecture,
              components: [
                ...(architecture.components ?? []),
                {
                  id: nextReviewId("component"),
                  name: "",
                  description: "",
                },
              ],
            },
          })
        }
      >
        Add component
      </button>
      {(architecture.externalServices ?? []).map((service, index) => (
        <article key={service.id} className={itemCardClass}>
          <TextInput
            id={`${service.id}-name`}
            label={`External service ${String(index + 1)} name`}
            value={service.name}
            disabled={disabled}
            onChange={(name) =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  externalServices: replaceItem(
                    architecture.externalServices ?? [],
                    index,
                    { ...service, name },
                  ),
                },
              })
            }
          />
          <TextArea
            id={`${service.id}-purpose`}
            label="Purpose"
            value={service.purpose}
            disabled={disabled}
            onChange={(purpose) =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  externalServices: replaceItem(
                    architecture.externalServices ?? [],
                    index,
                    { ...service, purpose },
                  ),
                },
              })
            }
          />
          <button
            type="button"
            disabled={disabled}
            className={ghostButtonClass}
            aria-label={`Delete external service ${String(index + 1)}`}
            onClick={() =>
              onChange({
                ...spec,
                architecture: {
                  ...architecture,
                  externalServices: removeItem(
                    architecture.externalServices ?? [],
                    index,
                  ),
                },
              })
            }
          >
            Delete
          </button>
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            architecture: {
              ...architecture,
              externalServices: [
                ...(architecture.externalServices ?? []),
                { id: nextReviewId("service"), name: "", purpose: "" },
              ],
            },
          })
        }
      >
        Add external service
      </button>
      <StringList
        id="architecture-constraints"
        label="Constraints"
        items={architecture.constraints ?? []}
        disabled={disabled}
        addLabel="Add architecture constraint"
        onChange={(constraints) =>
          onChange({
            ...spec,
            architecture: {
              ...architecture,
              constraints: constraints.length > 0 ? constraints : undefined,
            },
          })
        }
      />
    </ReviewSection>
  );
}

function DatabaseSection({ spec, disabled, onChange }: SectionProps) {
  if (!spec.database) {
    return (
      <ReviewSection title="Database">
        <EmptySection
          text="No database specification yet."
          action="Add database details"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, database: {} })}
        />
      </ReviewSection>
    );
  }

  const database = spec.database;
  return (
    <ReviewSection title="Database">
      {(database.entities ?? []).map((entity, index) => (
        <article key={entity.id} className={itemCardClass}>
          <TextInput
            id={`${entity.id}-name`}
            label={`Entity ${String(index + 1)} name`}
            value={entity.name}
            disabled={disabled}
            onChange={(name) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  entities: replaceItem(database.entities ?? [], index, {
                    ...entity,
                    name,
                  }),
                },
              })
            }
          />
          <TextArea
            id={`${entity.id}-description`}
            label="Description"
            value={entity.description}
            disabled={disabled}
            onChange={(description) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  entities: replaceItem(database.entities ?? [], index, {
                    ...entity,
                    description,
                  }),
                },
              })
            }
          />
          <button
            type="button"
            disabled={disabled}
            className={ghostButtonClass}
            aria-label={`Delete entity ${String(index + 1)}`}
            onClick={() =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  entities: removeItem(database.entities ?? [], index),
                },
              })
            }
          >
            Delete
          </button>
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            database: {
              ...database,
              entities: [
                ...(database.entities ?? []),
                { id: nextReviewId("entity"), name: "", description: "" },
              ],
            },
          })
        }
      >
        Add entity
      </button>
      {(database.relationships ?? []).map((relationship, index) => (
        <article key={`${relationship.from}-${relationship.to}-${String(index)}`} className={itemCardClass}>
          <p className="text-sm font-medium">Relationship {String(index + 1)}</p>
          <TextInput
            id={`rel-${String(index)}-from`}
            label="From"
            value={relationship.from}
            disabled={disabled}
            onChange={(from) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  relationships: replaceItem(database.relationships ?? [], index, {
                    ...relationship,
                    from,
                  }),
                },
              })
            }
          />
          <TextInput
            id={`rel-${String(index)}-to`}
            label="To"
            value={relationship.to}
            disabled={disabled}
            onChange={(to) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  relationships: replaceItem(database.relationships ?? [], index, {
                    ...relationship,
                    to,
                  }),
                },
              })
            }
          />
          <TextInput
            id={`rel-${String(index)}-type`}
            label="Type"
            value={relationship.type}
            disabled={disabled}
            onChange={(type) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  relationships: replaceItem(database.relationships ?? [], index, {
                    ...relationship,
                    type,
                  }),
                },
              })
            }
          />
          <TextArea
            id={`rel-${String(index)}-description`}
            label="Description"
            value={relationship.description ?? ""}
            disabled={disabled}
            onChange={(description) =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  relationships: replaceItem(database.relationships ?? [], index, {
                    ...relationship,
                    description: description || undefined,
                  }),
                },
              })
            }
          />
          <button
            type="button"
            disabled={disabled}
            className={ghostButtonClass}
            aria-label={`Delete relationship ${String(index + 1)}`}
            onClick={() =>
              onChange({
                ...spec,
                database: {
                  ...database,
                  relationships: removeItem(database.relationships ?? [], index),
                },
              })
            }
          >
            Delete
          </button>
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            database: {
              ...database,
              relationships: [
                ...(database.relationships ?? []),
                { from: "", to: "", type: "" },
              ],
            },
          })
        }
      >
        Add relationship
      </button>
      <StringList
        id="database-constraints"
        label="Constraints"
        items={database.constraints ?? []}
        disabled={disabled}
        addLabel="Add database constraint"
        onChange={(constraints) =>
          onChange({
            ...spec,
            database: {
              ...database,
              constraints: constraints.length > 0 ? constraints : undefined,
            },
          })
        }
      />
    </ReviewSection>
  );
}

function ApiSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.api) {
    return (
      <ReviewSection title="API">
        <EmptySection
          text="No API specification yet."
          action="Add API details"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, api: { endpoints: [] } })}
        />
      </ReviewSection>
    );
  }

  return (
    <ReviewSection title="API">
      {spec.api.endpoints.map((endpoint, index) => (
        <article key={`${endpoint.method}-${endpoint.path}-${String(index)}`} className={itemCardClass}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`endpoint-${String(index)}-method`}
              label="Method"
              value={endpoint.method}
              disabled={disabled}
              options={HTTP_METHODS.map((method) => ({ value: method, label: method }))}
              onChange={(method) =>
                updateEndpoint(spec, onChange, index, {
                  ...endpoint,
                  method: method as HttpMethod,
                })
              }
            />
            <TextInput
              id={`endpoint-${String(index)}-path`}
              label="Path"
              value={endpoint.path}
              disabled={disabled}
              error={fieldError(errors, `api.endpoints.${String(index)}.path`)}
              onChange={(path) =>
                updateEndpoint(spec, onChange, index, { ...endpoint, path })
              }
            />
          </div>
          <TextArea
            id={`endpoint-${String(index)}-purpose`}
            label="Purpose"
            value={endpoint.purpose}
            disabled={disabled}
            onChange={(purpose) =>
              updateEndpoint(spec, onChange, index, { ...endpoint, purpose })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={endpoint.authRequired}
              disabled={disabled}
              onChange={(event) =>
                updateEndpoint(spec, onChange, index, {
                  ...endpoint,
                  authRequired: event.target.checked,
                })
              }
            />
            Authentication required
          </label>
          <button
            type="button"
            disabled={disabled}
            className={ghostButtonClass}
            aria-label={`Delete endpoint ${String(index + 1)}`}
            onClick={() =>
              onChange({
                ...spec,
                api: { endpoints: removeItem(spec.api!.endpoints, index) },
              })
            }
          >
            Delete
          </button>
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            api: {
              endpoints: [
                ...spec.api!.endpoints,
                {
                  method: "GET",
                  path: "/",
                  purpose: "",
                  authRequired: true,
                },
              ],
            },
          })
        }
      >
        Add endpoint
      </button>
    </ReviewSection>
  );
}

function SecuritySection({ spec, disabled, onChange }: SectionProps) {
  if (!spec.security) {
    return (
      <ReviewSection title="Security">
        <EmptySection
          text="No security specification yet."
          action="Add security details"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, security: {} })}
        />
      </ReviewSection>
    );
  }

  const security = spec.security;
  return (
    <ReviewSection title="Security">
      <StringList
        id="security-authentication"
        label="Authentication"
        items={security.authentication ?? []}
        disabled={disabled}
        addLabel="Add authentication note"
        onChange={(authentication) =>
          onChange({ ...spec, security: { ...security, authentication } })
        }
      />
      <StringList
        id="security-authorization"
        label="Authorization"
        items={security.authorization ?? []}
        disabled={disabled}
        addLabel="Add authorization note"
        onChange={(authorization) =>
          onChange({ ...spec, security: { ...security, authorization } })
        }
      />
      <StringList
        id="security-sensitive"
        label="Sensitive data"
        items={security.sensitiveData ?? []}
        disabled={disabled}
        addLabel="Add sensitive data"
        onChange={(sensitiveData) =>
          onChange({ ...spec, security: { ...security, sensitiveData } })
        }
      />
      <StringList
        id="security-constraints"
        label="Constraints"
        items={security.constraints ?? []}
        disabled={disabled}
        addLabel="Add security constraint"
        onChange={(constraints) =>
          onChange({ ...spec, security: { ...security, constraints } })
        }
      />
    </ReviewSection>
  );
}

function ConstraintsSection({ spec, disabled, onChange }: SectionProps) {
  if (!spec.constraints) {
    return (
      <ReviewSection title="Constraints">
        <EmptySection
          text="No project constraints yet."
          action="Add constraints"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, constraints: {} })}
        />
      </ReviewSection>
    );
  }

  const constraints = spec.constraints;
  return (
    <ReviewSection title="Constraints">
      <TextInput
        id="constraints-budget"
        label="Budget"
        value={constraints.budget ?? ""}
        disabled={disabled}
        onChange={(budget) =>
          onChange({
            ...spec,
            constraints: optionalText(constraints, "budget", budget),
          })
        }
      />
      <StringList
        id="constraints-deployment"
        label="Deployment"
        items={constraints.deployment ?? []}
        disabled={disabled}
        addLabel="Add deployment constraint"
        onChange={(deployment) =>
          onChange({ ...spec, constraints: { ...constraints, deployment } })
        }
      />
      <StringList
        id="constraints-technology"
        label="Technology"
        items={constraints.technology ?? []}
        disabled={disabled}
        addLabel="Add technology constraint"
        onChange={(technology) =>
          onChange({ ...spec, constraints: { ...constraints, technology } })
        }
      />
      <StringList
        id="constraints-compliance"
        label="Compliance"
        items={constraints.compliance ?? []}
        disabled={disabled}
        addLabel="Add compliance constraint"
        onChange={(compliance) =>
          onChange({ ...spec, constraints: { ...constraints, compliance } })
        }
      />
      <StringList
        id="constraints-scope"
        label="Scope"
        items={constraints.scope ?? []}
        disabled={disabled}
        addLabel="Add scope constraint"
        onChange={(scope) =>
          onChange({ ...spec, constraints: { ...constraints, scope } })
        }
      />
    </ReviewSection>
  );
}

function AiRulesSection({ spec, disabled, errors, onChange }: SectionProps) {
  if (!spec.aiRules) {
    return (
      <ReviewSection title="AI Rules">
        <EmptySection
          text="No AI rules yet."
          action="Add AI rules"
          disabled={disabled}
          onAdd={() => onChange({ ...spec, aiRules: [] })}
        />
      </ReviewSection>
    );
  }

  return (
    <ReviewSection title="AI Rules">
      {spec.aiRules.map((rule, index) => (
        <article key={rule.id} className={itemCardClass}>
          <TextInput
            id={`${rule.id}-title`}
            label={`Rule ${String(index + 1)} title`}
            value={rule.title}
            disabled={disabled}
            error={fieldError(errors, `aiRules.${String(index)}.title`)}
            onChange={(title) => updateRule(spec, onChange, index, { ...rule, title })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`${rule.id}-priority`}
              label="Priority"
              value={rule.priority}
              disabled={disabled}
              options={PRIORITY_OPTIONS}
              onChange={(priority) =>
                updateRule(spec, onChange, index, {
                  ...rule,
                  priority: priority as Priority,
                })
              }
            />
            <SelectField
              id={`${rule.id}-activation`}
              label="Activation"
              value={rule.activationMode}
              disabled={disabled}
              options={ACTIVATION_MODES}
              onChange={(mode) =>
                updateRule(spec, onChange, index, setActivation(rule, mode as ActivationMode))
              }
            />
          </div>
          <TextArea
            id={`${rule.id}-description`}
            label="Description"
            value={rule.description ?? ""}
            disabled={disabled}
            onChange={(description) =>
              updateRule(spec, onChange, index, {
                ...rule,
                description: description || undefined,
              })
            }
          />
          <TextArea
            id={`${rule.id}-body`}
            label="Body"
            value={rule.body}
            disabled={disabled}
            error={fieldError(errors, `aiRules.${String(index)}.body`)}
            onChange={(body) => updateRule(spec, onChange, index, { ...rule, body })}
          />
          <TextArea
            id={`${rule.id}-rationale`}
            label="Rationale"
            value={rule.rationale}
            disabled={disabled}
            onChange={(rationale) =>
              updateRule(spec, onChange, index, { ...rule, rationale })
            }
          />
          {rule.activationMode === "scoped" ||
          (rule.activationMode !== "always" && rule.globs) ? (
            <StringList
              id={`${rule.id}-globs`}
              label="Globs"
              items={rule.globs ?? []}
              disabled={disabled}
              addLabel="Add glob"
              onChange={(globs) =>
                updateRule(spec, onChange, index, setRuleGlobs(rule, globs))
              }
            />
          ) : null}
          <button
            type="button"
            disabled={disabled}
            className={ghostButtonClass}
            aria-label={`Delete AI rule ${String(index + 1)}`}
            onClick={() =>
              onChange({ ...spec, aiRules: removeItem(spec.aiRules!, index) })
            }
          >
            Delete
          </button>
        </article>
      ))}
      <button
        type="button"
        disabled={disabled}
        className={ghostButtonClass}
        onClick={() =>
          onChange({
            ...spec,
            aiRules: [
              ...spec.aiRules!,
              {
                id: nextReviewId("rule"),
                title: "",
                priority: "must",
                activationMode: "always",
                body: "",
                rationale: "",
              },
            ],
          })
        }
      >
        Add AI rule
      </button>
    </ReviewSection>
  );
}

interface SectionProps {
  spec: ProjectSpec;
  disabled: boolean;
  errors?: readonly ReviewFieldError[];
  onChange: (spec: ProjectSpec) => void;
}

function EmptySection({
  text,
  action,
  disabled,
  onAdd,
}: {
  text: string;
  action: string;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-white/10 bg-white/2 px-4 py-5">
      <p className="text-sm leading-6 text-white/50">{text}</p>
      <button type="button" disabled={disabled} className={ghostButtonClass} onClick={onAdd}>
        {action}
      </button>
    </div>
  );
}

function ItemControls({
  label,
  index,
  last,
  disabled,
  onMove,
  onDelete,
}: {
  label: string;
  index: number;
  last: boolean;
  disabled: boolean;
  onMove: (offset: number) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <IconButton
        label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon />
      </IconButton>
      <IconButton
        label={`Move ${label} down`}
        disabled={disabled || last}
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon />
      </IconButton>
      <IconButton
        label={`Delete ${label}`}
        disabled={disabled}
        onClick={onDelete}
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}

function updateFeatures(
  spec: ProjectSpec,
  onChange: (spec: ProjectSpec) => void,
  index: number,
  feature: Feature,
) {
  onChange({ ...spec, features: replaceItem(spec.features ?? [], index, feature) });
}

function updateUsers(
  spec: ProjectSpec,
  onChange: (spec: ProjectSpec) => void,
  index: number,
  user: UserType,
) {
  onChange({ ...spec, users: replaceItem(spec.users ?? [], index, user) });
}

function updateEndpoint(
  spec: ProjectSpec,
  onChange: (spec: ProjectSpec) => void,
  index: number,
  endpoint: ApiEndpoint,
) {
  onChange({
    ...spec,
    api: { endpoints: replaceItem(spec.api?.endpoints ?? [], index, endpoint) },
  });
}

function updateRule(
  spec: ProjectSpec,
  onChange: (spec: ProjectSpec) => void,
  index: number,
  rule: AIRule,
) {
  onChange({ ...spec, aiRules: replaceItem(spec.aiRules ?? [], index, rule) });
}

function optionalText<T extends object, K extends keyof T>(
  current: T,
  key: K,
  value: string,
): T {
  if (value.trim().length === 0) {
    const next = { ...current };
    delete next[key];
    return next;
  }

  return { ...current, [key]: value };
}

function setActivation(rule: AIRule, mode: ActivationMode): AIRule {
  const base = {
    id: rule.id,
    title: rule.title,
    priority: rule.priority,
    description: rule.description,
    body: rule.body,
    rationale: rule.rationale,
  };

  if (mode === "always") {
    return { ...base, activationMode: "always" };
  }

  if (mode === "scoped") {
    return {
      ...base,
      activationMode: "scoped",
      globs: "globs" in rule && rule.globs && rule.globs.length > 0 ? rule.globs : [""],
    };
  }

  return {
    ...base,
    activationMode: mode,
    globs: "globs" in rule ? rule.globs : undefined,
  };
}

function setRuleGlobs(rule: AIRule, globs: string[]): AIRule {
  if (rule.activationMode === "always") {
    return rule;
  }

  if (rule.activationMode === "scoped") {
    return { ...rule, globs };
  }

  return { ...rule, globs: globs.length > 0 ? globs : undefined };
}
