# EMS Backend — PRD / SRS

**Scope lock:** Attendance, Leave, Employee, Department, and Employee History only. Inventory, Finance, Official Announcements, and other HCM concerns are out of scope for this iteration. Core focus = HCM (Human Capital Management).

**Precedence rule:** If any requirement below conflicts with the **SRS Track#60** document (appended at the end), **SRS Track#60 wins.**

**Hard rule:** No delete operations anywhere — models, services, or routes. Employee data and all related records are append/update only.

---

## 1. Employee Info — Total Count

![alt text](image-3.png)

- Total employee count is derived, not stored.
- Fetch all employees from `employee_info` into an array, then return `array.length`.

---

## 2. Employee Creation — `employee_info` Table

![alt text](image-2.png)

Employee creation is a **two-step insert**:

1. Insert into `employee_info`.
2. Insert into `job_info`.

### 2.1 `employee_info` — Required Fields

All fields below are **required** and must be validated before insert.

```sql
id              uuid NOT NULL DEFAULT gen_random_uuid(),
employee_id     character varying(10) COLLATE pg_catalog."default" NOT NULL,
name            character varying(100) COLLATE pg_catalog."default" NOT NULL,
father_name     character varying(100) COLLATE pg_catalog."default" NOT NULL,
cnic            character varying(20)  COLLATE pg_catalog."default" NOT NULL,
date_of_birth   character varying(15)  COLLATE pg_catalog."default" NOT NULL,
created_at      timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
updated_at      timestamp with time zone DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT employee_info_pkey         PRIMARY KEY (id),
CONSTRAINT employee_info_cnic_key     UNIQUE (cnic),
CONSTRAINT employee_info_employee_id_key UNIQUE (employee_id)
```

### 2.2 Validation

- Every field must be validated on the HR-submitted payload.
- **Open decision:** pick a validation library — **Joi** or **Zod** (npm). Recommend one and standardize across all routes.
- On validation failure, return a structured error response with a **meaningful HTTP status code** (not just 400/500 blanket codes). Each distinct failure class should map to its own status code so debugging is traceable.

### 2.3 No Delete

- No `DELETE` route, service, or model method for employee data.
- Applies to all tables in this system, not just `employee_info`.

---

## 3. Employee Page — View, Search, Edit

![alt text](image-4.png)

### 3.1 List & Search

- Search employees by **name** or **employee_id**.

### 3.2 Action Buttons

![alt text](image-5.png)

**Button 1 — View:** opens a sectioned detail view. All fields for that employee grouped into tabs:

- Personal
- Job Info
- Medical
- Attendance
- Leave
- Payslips
- Promotions
- Penalties
- Activity
- Documents

Clicking a tab shows only the fields belonging to that tab's underlying table.

**Button 2 — Edit:** redirects to the Employee Edit page with the `employee_id` passed through. Form is pre-populated. Frontend handles routing and form state; backend just supplies the data and accepts the update.

![alt text](image-6.png)

### 3.3 Frontend State Management — Open Decision

- Recommend: **Context API vs Redux Toolkit**. Pick one and document the rationale (app complexity, shared state depth, team familiarity).

---

## 4. Attendance — Daily Sheet

![alt text](image-7.png)

### 4.1 Fields Displayed Per Row

| Field | Source | Notes |
|---|---|---|
| Employee Info (name, designation, emp_id only) | `employee_info` + `job_info` | No extra personal fields |
| Shift | `shifts` table | Morning / Evening / Night |
| Expected In | `shifts` table | — |
| Check In | `shifts` table | — |
| Check Out | `shifts` table | — |
| Status | HR input | Present / Absent. If Present, Check In/Out render on frontend |
| Late By | Calculated | `check_in − expected_in`, shown in minutes/hours |
| Notes | Auto or HR input | If late/absent — HR enters. If on approved leave — auto-filled with leave reason and **read-only** |
| Ack | HR acknowledges | Confirmation checkbox — marked by HR |

### 4.2 Save Changes Button

![alt text](image-1.png)

- Attendance is **not** pushed per check-in / check-out.
- HR edits the full day's grid, then clicks **Save Changes** — one batched request sends all rows to the server.
- Reason: HR may need to correct times, or an employee may call in late with a reason. Saving per-event would lock the data prematurely.
- On save, validate all rows; return meaningful status codes per error class.

---

## 5. Attendance Filtering & Monthly Report

![alt text](image.png)

### 5.1 Filters

HR can filter attendance by:

- Specific **date**
- **Employee**
- **Department**
- **Location**
- **Shift**

### 5.2 Monthly Report

Per-employee roll-up for the selected month:

| Column | Meaning |
|---|---|
| Employee | Name + ID |
| Presents | Count |
| Absents | Count |
| Lates | Count |
| Half Days | Count |
| On Leaves | Count |
| Total Working Days | Count |
| % | Attendance percentage |

---

## 6. Leave — New Request

![alt text](image-8.png)

### 6.1 Modal Flow

![model Picture](image-9.png)

When HR clicks **New Leave Request**, a modal opens with:

![alt text](image-10.png)

- **Employee selector** — dropdown displays `name + employee_id` for HR clarity; backend binds by `id` only.
- **Leave Type** — dropdown from `leave_types`.
- **From date** — calendar picker.
- **To date** — calendar picker.
- **Reason** — text.

### 6.2 Validation

- Frontend check: requested days must not exceed the employee's current leave balance for that leave type.
- Backend validation on every field with **granular HTTP status codes** — do not collapse everything into 200/404. Status codes should distinguish: missing field, invalid type, balance exceeded, overlapping leave, unknown employee, etc.

---

## 7. Leave Page — Tabs

![alt text](image-11.png)

Tabs: **All / Pending / Approved / Rejected / 📅 Calendar / 📊 Balances**

### 7.1 Pending

![alt text](image-12.png)

Columns: `Employee, Type, From, To, Days, Reason, Applied, Status, Actions`

### 7.2 Approved

![alt text](image-13.png)

Columns: `Employee, Type, From, To, Days, Reason, Applied, Status, Early Return`

Example row: `Ahmed Ali (EMP001) | Annual | 2026-03-01 | 2026-03-05 | 5 | Family vacation | 2026-02-25 | Approved`

#### Early Return Button — Logic

Purpose: an employee on approved leave may return early (plans cancelled, flight delayed into next window, etc.) — their unused days should be restored to balance instead of consumed.

Mechanism:

- A new field `end_by_force` is added. It acts as the **final submission date** for the leave.
- Default value: today's date (set automatically when HR clicks **Early Return**).
- Days calculation switches from `(start_date → end_date)` to `(start_date → end_by_force)`.

Worked example:

- Employee applied for **10 days** annual leave.
- Returns to office on day **3**.
- HR clicks Early Return → `end_by_force = today`.
- System computes:
  - Days Actually Taken = **2**
  - Days to Restore = **10 − 2 = 8**
- Balance is updated accordingly.

### 7.3 Rejected

![Rejected Section](image-14.png)

Columns: `Employee, Type, From, To, Days, Reason, Applied, Status, Actions`

- `Actions` column has **no actions** — the request is terminal.

### 7.4 Calendar

![alt text](image-15.png)

- No new backend work needed — reuses existing leave data.
- Frontend accepts date ranges from the API and renders them onto a calendar view.
- HR can filter by **department**, and ideally by **month** and **year**.

### 7.5 Balances

![alt text](image-16.png)

- Table of every employee with their remaining balance per leave type.
- Filters: **department**, **location**, **shift**.
- Example row: `Ahmed Ali (EMP001) | Engineering | Annual 5/12 | Casual 1/12 | Medical 0/8`

---

## 8. Configuration Tables — Super Admin Only

CRUD on configuration tables is restricted to **super_admin**. HR cannot add/edit these.

Tables:

- Departments
- Designations
- Job Statuses
- Work Modes
- Work Locations
- Employment Types
- Shifts
- Leave Types
- Leave Policies

When a new department, location, shift, etc. is needed, only super_admin can create it.

---

## 9. Roles & Permissions

**Current roles (mandatory, non-negotiable for v1):**

- `super_admin` — full system access, owns configuration tables.
- `hr` — employee + attendance + leave operations.
- `employee` — self-service only.

More roles and finer-grained permissions will be added in future iterations. The permission layer must be designed to accommodate that extension.

---

## Appendix A — SRS Track#60 (Authoritative)

> If any requirement above contradicts this section, **this section takes precedence.**

### ERP: Functional Blueprint V1.1

### 1. The Global Ecosystem (The "Shell")

Before entering any specific department, the system provides a unified experience. This ensures that even if we have a 1,000-person company, the core "Office" experience remains consistent.

**A. The Multi-Module App Switcher**

- **Logic:** Upon login, the user lands on a "Launchpad."
- **Dynamic Access:** The system checks the user's Department and Role.
- **Example:** If a user is in "Sales," the "Inventory" icon might be accessible but "HR Admin" and "Finance" icons will not allow the user to access them.

**B. The Universal Global Sidebar**

The sidebar stays with the user everywhere. It contains the "Personal Office" features:

- **Attendance Live-Status:** A real-time indicator. If HR marks them "Present," a green check appears.
- **Quick Notification Center:** Centralized "Push Notifications" for the web. "Your leave was approved," "New Penalty applied," or "Off day announcement."
- **Self-Service Shortcuts:** One-click access to apply for leave or view pay slips.

### 2. Module: Human Resources (The "Admin" Side)

The HR module is the "Source of Truth" for every person in the company. In a multi-branch setup, the system distinguishes between **Branch HR (Data Entry)** and **Head Office (HO) HR (Final Authority)**.

**Feature 1: HR Executive Dashboard (Analytics & Stats)**

- **Logic:** HR needs a "bird's-eye view" of the company's health across all branches.
- **Key Stats (KPIs):**
  - **Attendance Overview:** Percentage of employees Present, Late, or Absent today (with a branch-wise toggle).
  - **Leave Pipeline:** Number of pending leave requests requiring immediate action.
  - **Penalty Summary:** Total fines collected/applied in the current month.
  - **Staff Count:** Total active employees categorized by Department and Branch.
  - **Birthdays/Anniversaries:** Upcoming employee milestones for culture building.

**Feature 2: Digital Attendance Ledger (The "Master Sheet")**

- **Business Problem:** Physical registers are hard to track and centralize across branches.
- **Solution:** A high-speed digital grid for Branch HR.
- **Flow:**
  1. **Branch-Lock Logic:** Branch HR opens the daily sheet. It only lists employees assigned to their specific branch.
  2. **Entry:** As people arrive, HR enters the "Check-in" time.
  3. **Late Logic:** If a shift starts at 9:00 AM and HR enters 9:15 AM, the system flags the row as **RED (Late)** while respecting the pre-defined grace time.
  4. **Submission:** At the end of the day, Branch HR "Submits" the sheet to the Head Office. Once submitted, the branch can no longer edit the data without HO permission.

**Feature 3: The Penalty & Fine Engine**

- **Business Problem:** Deductions are often forgotten or disputed at month-end.
- **Solution:** Immediate transparency with HO oversight.
- **Flow:**
  1. **Configuration:** HO HR defines global "Rules" (e.g., Late arrival = 500 PKR).
  2. **Proposal:** Branch HR selects a local employee and "Applies" a penalty based on the rules.
  3. **HO Approval:** The penalty remains "Pending" until Head Office HR reviews it.
  4. **Real-time Alert:** Once HO approves, the employee gets a notification on their sidebar. This creates a clear digital trail.

**Feature 4: Leave & Capacity Management**

- **Logic:** Managing "Office Capacity" to ensure departments aren't understaffed.
- **Flow:**
  - **Visibility:** HR sees a calendar view of who is already on leave within a specific branch or department.
  - **Conflict Check:** If too many people from one team (e.g., IT) are off, the system flags a "Capacity Alert."
  - **Approval:** HR approves/rejects based on these operational needs.

**Feature 5: Unified Employee Onboarding & Credentialing**

- **Logic:** Creating a digital identity for the whole ERP.
- **Flow:**
  1. **Data Entry:** HR enters core details (Personal info, Medical records, Emergency contacts, Job details).
  2. **Access Provisioning:** HR assigns a Branch, Department, and Role.
  3. **Automatic Account Creation:** Upon saving, the system generates a unique User ID and temporary Password.
  4. **Credential Delivery:** The system generates a PDF/Email for HR to give to the new hire for their first login.

**Feature 6: Organization & Department Management**

- **Logic:** Reshaping the company structure (Branches and Departments) digitally.
- **Flow:**
  - **Branch Setup:** HO HR adds/edits office locations (e.g., "Karachi Branch," "Lahore Branch").
  - **Department Hierarchy:** HR adds new Departments (e.g., "Operations," "Sales") and maps them to specific branches or as "Cross-Branch" entities.
  - **Designations:** Defining titles (CEO, Manager, Intern) within those departments.

### 3. Module: The Employee Portal (The "Standard User" Side)

Every person in the company — from the CEO to the Sales Executive — uses this journey.

**Feature 1: Digital Attendance Verification (The "Signature")**

- **Flow:**
  1. The employee sees a notification: "HR marked you as 'Present' (Late) at 9:20 AM. Please verify."
  2. The employee clicks "Verify/Acknowledge."
  3. **Business Logic:** This acts as a digital signature. If the employee thinks HR made a mistake, they don't click verify; they go to the HR desk to fix it. This eliminates "I was actually on time" arguments during payroll.

**Feature 2: Leave Self-Service & Balance Tracking**

- **Flow:**
  - **Balance View:** Before applying, the employee sees their "Wallet." (e.g., 10 Casual Leaves remaining, 5 Sick Leaves).
  - **Request:** They fill out a form (Date + Reason).
  - **History:** They can track the status (Draft → Pending → Approved).

**Feature 3: The Penalty Transparency Tab**

- **Flow:** Employees can see a ledger of all fines.
- **Why?** It builds a culture of accountability. They can see exactly why their salary might be lower this month.

**Feature 4: Official Announcements**

- **Flow:** A dedicated feed. Unlike an email that gets lost, these are "Pinned" notices. Once an employee reads it, it marks as "Read" for HR to track who has seen the memo.

**Feature 5 (Global): Security & Personal Settings**

- **Logic:** Security is a shared responsibility.
- **Flow:**
  - Users have a "Settings" icon in the Sidebar.
  - **Password Management:** Users must change their temporary password on first login and can update it anytime for security.
  - **Profile View:** Users can view (but usually not edit) their medical and personal info to ensure HR has the correct data.

**Feature 6: The "Office Phonebook" (Company Directory)**

- **Logic:** Centralizing utility contacts to stop the "Who do I call for X?" interruptions.
- **Flow:**
  - **Central Directory:** A searchable list of Departmental Extensions and Office Landlines (e.g., IT Support, Maintenance/Admin, HR Front Desk, Pantry/Peon Station).
  - **Role-Based Visibility:** Employees see the numbers they need. They don't see personal mobile numbers unless the contact person has marked them as "Public."
  - **Branch-Specific View:** By default, an employee sees their own branch's directory, but they can toggle to "Head Office" or "Other Branches" if they need to coordinate across locations.

**Feature 7: The Employee Personal Dashboard**

- **Logic:** The first screen an employee sees after the Launchpad. It summarizes their "Professional Health" so they don't have to navigate through menus to find basic info.
- **Visual Components (Widgets):**
  - **Attendance Summary:** A circular progress chart or cards showing "Present Days," "Late Arrivals," and "Absent" for the current month.
  - **Leave Wallet:** A quick-view card showing remaining balances (e.g., Casual: 4 left, Sick: 2 left).
  - **Active Penalty Alert:** If a new penalty was approved by HO, a prominent alert box appears until the employee acknowledges it.
  - **Upcoming Holidays:** A countdown or list of the next 3 company-wide holidays.
  - **My Activity Logs:** A simplified feed showing recent actions (e.g., "You applied for leave yesterday," "Attendance verified at 9:10 AM").
  - **Quick Action Buttons:** Large, accessible buttons for "Apply Leave" and "View Company Directory."

---

## Open Decisions (For Your Review)

1. **Validation library** — Joi or Zod? Zod always
2. **Frontend state** — Context API or Redux Toolkit? not my consern will happen from frontend right now only backend ok  
3. **HTTP status code map** — define the full set (401, 403, 409, 422, etc.) used across validation/business errors so debugging is deterministic.
4. **These For other code statuses** - **HTTP response status codes HTTP response status codes indicate whether a specific HTTP request has been successfully completed. Responses are grouped in five classes:  Informational responses (100 – 199) Successful responses (200 – 299) Redirection messages (300 – 399) Client error responses (400 – 499) Server error responses (500 – 599) The status codes listed below are defined by RFC 9110. Note: If you receive a response that is not listed here, it is a non-standard response, possibly custom to the server's software. In this article Informational responses Successful responses Redirection messages Client error responses Server error responses Browser compatibility See also Informational responses 100 Continue This interim response indicates that the client should continue the request or ignore the response if the request is already finished. 101 Switching Protocols This code is sent in response to an Upgrade request header from the client and indicates the protocol the server is switching to. 102 Processing Deprecated This code was used in WebDAV contexts to indicate that a request has been received by the server, but no status was available at the time of the response. 103 Early Hints This status code is primarily intended to be used with the Link header, letting the user agent start preloading resources while the server prepares a response or preconnect to an origin from which the page will need resources. Successful responses 200 OK The request succeeded. The result and meaning of "success" depends on the HTTP method: GET: The resource has been fetched and transmitted in the message body. HEAD: Representation headers are included in the response without any message body. PUT or POST: The resource describing the result of the action is transmitted in the message body. TRACE: The message body contains the request as received by the server. 201 Created The request succeeded, and a new resource was created as a result. This is typically the response sent after POST requests, or some PUT requests. 202 Accepted The request has been received but not yet acted upon. It is noncommittal, since there is no way in HTTP to later send an asynchronous response indicating the outcome of the request. It is intended for cases where another process or server handles the request, or for batch processing. 203 Non-Authoritative Information This response code means the returned metadata is not exactly the same as is available from the origin server, but is collected from a local or a third-party copy. This is mostly used for mirrors or backups of another resource. Except for that specific case, the 200 OK response is preferred to this status. 204 No Content There is no content to send for this request, but the headers are useful. The user agent may update its cached headers for this resource with the new ones. 205 Reset Content Tells the user agent to reset the document which sent this request. 206 Partial Content This response code is used in response to a range request when the client has requested a part or parts of a resource. 207 Multi-Status (WebDAV) Conveys information about multiple resources, for situations where multiple status codes might be appropriate. 208 Already Reported (WebDAV) Used inside a <dav:propstat> response element to avoid repeatedly enumerating the internal members of multiple bindings to the same collection. 226 IM Used (HTTP Delta encoding) The server has fulfilled a GET request for the resource, and the response is a representation of the result of one or more instance-manipulations applied to the current instance. Redirection messages 300 Multiple Choices In agent-driven content negotiation, the request has more than one possible response and the user agent or user should choose one of them. There is no standardized way for clients to automatically choose one of the responses, so this is rarely used. 301 Moved Permanently The URL of the requested resource has been changed permanently. The new URL is given in the response. 302 Found This response code means that the URI of requested resource has been changed temporarily. Further changes in the URI might be made in the future, so the same URI should be used by the client in future requests. 303 See Other The server sent this response to direct the client to get the requested resource at another URI with a GET request. 304 Not Modified This is used for caching purposes. It tells the client that the response has not been modified, so the client can continue to use the same cached version of the response. 305 Use Proxy Deprecated Defined in a previous version of the HTTP specification to indicate that a requested response must be accessed by a proxy. It has been deprecated due to security concerns regarding in-band configuration of a proxy. 306 unused This response code is no longer used; but is reserved. It was used in a previous version of the HTTP/1.1 specification. 307 Temporary Redirect The server sends this response to direct the client to get the requested resource at another URI with the same method that was used in the prior request. This has the same semantics as the 302 Found response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the redirected request. 308 Permanent Redirect This means that the resource is now permanently located at another URI, specified by the Location response header. This has the same semantics as the 301 Moved Permanently HTTP response code, with the exception that the user agent must not change the HTTP method used: if a POST was used in the first request, a POST must be used in the second request. Client error responses 400 Bad Request The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing). 401 Unauthorized Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response. 402 Payment Required The initial purpose of this code was for digital payment systems, however this status code is rarely used and no standard convention exists. 403 Forbidden The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server. 404 Not Found The server cannot find the requested resource. In the browser, this means the URL is not recognized. In an API, this can also mean that the endpoint is valid but the resource itself does not exist. Servers may also send this response instead of 403 Forbidden to hide the existence of a resource from an unauthorized client. This response code is probably the most well known due to its frequent occurrence on the web. 405 Method Not Allowed The request method is known by the server but is not supported by the target resource. For example, an API may not allow DELETE on a resource, or the TRACE method entirely. 406 Not Acceptable This response is sent when the web server, after performing server-driven content negotiation, doesn't find any content that conforms to the criteria given by the user agent. 407 Proxy Authentication Required This is similar to 401 Unauthorized but authentication is needed to be done by a proxy. 408 Request Timeout This response is sent on an idle connection by some servers, even without any previous request by the client. It means that the server would like to shut down this unused connection. This response is used much more since some browsers use HTTP pre-connection mechanisms to speed up browsing. Some servers may shut down a connection without sending this message. 409 Conflict This response is sent when a request conflicts with the current state of the server. In WebDAV remote web authoring, 409 responses are errors sent to the client so that a user might be able to resolve a conflict and resubmit the request. 410 Gone This response is sent when the requested content has been permanently deleted from server, with no forwarding address. Clients are expected to remove their caches and links to the resource. The HTTP specification intends this status code to be used for "limited-time, promotional services". APIs should not feel compelled to indicate resources that have been deleted with this status code. 411 Length Required Server rejected the request because the Content-Length header field is not defined and the server requires it. 412 Precondition Failed In conditional requests, the client has indicated preconditions in its headers which the server does not meet. 413 Content Too Large The request body is larger than limits defined by server. The server might close the connection or return a Retry-After header field. 414 URI Too Long The URI requested by the client is longer than the server is willing to interpret. 415 Unsupported Media Type The media format of the requested data is not supported by the server, so the server is rejecting the request. 416 Range Not Satisfiable The ranges specified by the Range header field in the request cannot be fulfilled. It's possible that the range is outside the size of the target resource's data. 417 Expectation Failed This response code means the expectation indicated by the Expect request header field cannot be met by the server. 418 I'm a teapot The server refuses the attempt to brew coffee with a teapot. 421 Misdirected Request The request was directed at a server that is not able to produce a response. This can be sent by a server that is not configured to produce responses for the combination of scheme and authority that are included in the request URI. 422 Unprocessable Content (WebDAV) The request was well-formed but was unable to be followed due to semantic errors. 423 Locked (WebDAV) The resource that is being accessed is locked. 424 Failed Dependency (WebDAV) The request failed due to failure of a previous request. 425 Too Early Experimental Indicates that the server is unwilling to risk processing a request that might be replayed. 426 Upgrade Required The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol. The server sends an Upgrade header in a 426 response to indicate the required protocol(s). 428 Precondition Required The origin server requires the request to be conditional. This response is intended to prevent the 'lost update' problem, where a client GETs a resource's state, modifies it and PUTs it back to the server, when meanwhile a third party has modified the state on the server, leading to a conflict. 429 Too Many Requests The user has sent too many requests in a given amount of time (rate limiting). 431 Request Header Fields Too Large The server is unwilling to process the request because its header fields are too large. The request may be resubmitted after reducing the size of the request header fields. 451 Unavailable For Legal Reasons The user agent requested a resource that cannot legally be provided, such as a web page censored by a government. Server error responses 500 Internal Server Error The server has encountered a situation it does not know how to handle. This error is generic, indicating that the server cannot find a more appropriate 5XX status code to respond with. 501 Not Implemented The request method is not supported by the server and cannot be handled. The only methods that servers are required to support (and therefore must not return this code) are GET and HEAD. 502 Bad Gateway This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response. 503 Service Unavailable The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded. Note that together with this response, a user-friendly page explaining the problem should be sent. This response should be used for temporary conditions and the Retry-After HTTP header should, if possible, contain the estimated time before the recovery of the service. The webmaster must also take care about the caching-related headers that are sent along with this response, as these temporary condition responses should usually not be cached. 504 Gateway Timeout This error response is given when the server is acting as a gateway and cannot get a response in time. 505 HTTP Version Not Supported The HTTP version used in the request is not supported by the server. 506 Variant Also Negotiates The server has an internal configuration error: during content negotiation, the chosen variant is configured to engage in content negotiation itself, which results in circular references when creating responses. 507 Insufficient Storage (WebDAV) The method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request. 508 Loop Detected (WebDAV) The server detected an infinite loop while processing the request. 510 Not Extended The client request declares an HTTP Extension (RFC 2774) that should be used to process the request, but the extension is not supported. 511 Network Authentication Required Indicates that the client needs to authenticate to gain network access.**