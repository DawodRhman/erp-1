#Employee_Salary

``
| Column Name        | Data Type     | Constraints                 | Description                                                                                                                          |
| ------------------ | ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`               | UUID          | Primary Key, Auto-generated | Unique identifier for the salary record.                                                                                             |
| `employee_id`      | VARCHAR(10)   | Foreign Key, Required       | References the employee information table.                                                                                           |
| `basic_salary`     | NUMERIC(14,2) | Required, Must be `>= 0`    | The employee’s base salary amount.                                                                                                   |
| `currency`         | VARCHAR(3)    | Required, Default: `PKR`    | Currency code for the salary.                                                                                                        |
| `effective_from`   | DATE          | Required                    | Start date of the salary record.                                                                                                     |
| `effective_to`     | DATE          | Nullable                    | End date of the salary record.                                                                                                       |
| `is_current`       | BOOLEAN       | Required, Default: `TRUE`   | Indicates whether this is the employee’s current active salary.                                                                      |
| `is_active`        | BOOLEAN       | Required, Default: `TRUE`   | Indicates whether the record is active or inactive.                                                                                  |
| `revision_type`    | VARCHAR(30)   | Required                    | Salary revision category such as `Initial`, `Promotion`, `Demotion`, `Increment`, `Decrement`, `Correction`, or `Market Adjustment`. |
| `revision_percent` | NUMERIC(5,2)  | Nullable                    | Percentage increase or decrease in salary. Usually empty for the first salary entry.                                                 |
| `revision_reason`  | TEXT          | Nullable                    | Optional explanation or remarks for the salary revision.                                                                             |
| `created_by`       | UUID          | Foreign Key, Optional       | References the user who created the record.                                                                                          |
| `created_at`       | TIMESTAMPTZ   | Required, Default: `NOW()`  | Date and time when the record was created.                                                                                           |
| `updated_at`       | TIMESTAMPTZ   | Required, Default: `NOW()`  | Date and time when the record was last updated.                                                                                      |

``






#COnfig table = Allowance Types
``
| Column Name             | Data Type    | Constraints                 | Description                                                                          |
| ----------------------- | ------------ | --------------------------- | ------------------------------------------------------------------------------------ |
| `id`                    | UUID         | Primary Key, Auto-generated | Unique identifier for the allowance type record.                                     |
| `code`                  | VARCHAR(30)  | Required, Unique            | Short internal code for the allowance type such as `HRA`, `MEDICAL`, or `TRANSPORT`. |
| `display_name`          | VARCHAR(100) | Required                    | Human-readable name displayed in the frontend, such as “House Rent Allowance”.       |
| `description`           | TEXT         | Nullable                    | Optional explanation or details about the allowance type.                            |
| `default_is_percentage` | BOOLEAN      | Required, Default: `FALSE`  | Indicates whether this allowance is usually percentage-based by default.             |
| `is_active`             | BOOLEAN      | Required, Default: `TRUE`   | Indicates whether the allowance type is active and available for use.                |
| `created_at`            | TIMESTAMPTZ  | Required, Default: `NOW()`  | Date and time when the record was created.                                           |
| `updated_at`            | TIMESTAMPTZ  | Required, Default: `NOW()`  | Date and time when the record was last updated.                                      |
``



#employee_allowance one emp many allowance 
``
| Column Name         | Data Type     | Constraints                 | Description                                                         |
| ------------------- | ------------- | --------------------------- | ------------------------------------------------------------------- |
| `id`                | UUID          | Primary Key, Auto-generated | Unique identifier for the salary allowance record.                  |
| `employee_id`       | VARCHAR(10)   | Foreign Key, Required       | References the employee information table.                          |
| `allowance_type_id` | UUID          | Foreign Key, Required       | References the allowance type configuration table.                  |
| `amount`            | NUMERIC(14,2) | Required, Must be `>= 0`    | The allowance value or percentage amount.                           |
| `is_percentage`     | BOOLEAN       | Required, Default: `FALSE`  | Indicates whether the amount is percentage-based or a fixed amount. if its false them amout will be in pkr and if its true then its in %  |
| `is_current`        | BOOLEAN       | Required, Default: `TRUE`   | Indicates whether this is the employee’s current active allowance.  |
| `is_active`         | BOOLEAN       | Required, Default: `TRUE`   | Indicates whether the allowance record is active or inactive.       |
| `created_by`        | UUID          | Foreign Key, Optional       | References the user who created the record.                         |
| `created_at`        | TIMESTAMPTZ   | Required, Default: `NOW()`  | Date and time when the record was created.                          |
| `updated_at`        | TIMESTAMPTZ   | Required, Default: `NOW()`  | Date and time when the record was last updated.                     |
