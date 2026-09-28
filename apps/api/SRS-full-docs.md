# Tab 1

**TRACK360 ERP: Functional Blueprint V1.1**

**1\. The Global Ecosystem (The "Shell")**

Before entering any specific department, the system provides a unified experience. This ensures that even if we have a 1,000-person company, the core "Office" experience remains consistent.

**A. The Multi-Module App Switcher**

* **Logic:** Upon login, the user lands on a "Launchpad."  
* **Dynamic Access:** The system checks the user’s Department and Role.  
  * *Example:* If a user is in "Sales," the "Inventory" icon might be accessible but "HR Admin" and "Finance" icons will not allow the user to access them.

**B. The Universal Global Sidebar**

The sidebar stays with the user everywhere. It contains the **"Personal Office"** features:

* **Attendance Live-Status:** A real-time indicator. If HR marks them "Present," a green check appears.  
* **Quick Notification Center:** Centralized "Push Notifications" for the web. "Your leave was approved," "New Penalty applied," or "Off day announcement.”  
* **Self-Service Shortcuts:** One-click access to apply for leave or view pay slips.

**2\. Module: Human Resources (The "Admin" Side)**

The HR module is the "Source of Truth" for every person in the company. In a multi-branch setup, the system distinguishes between Branch HR (Data Entry) and Head Office (HO) HR (Final Authority).

**Feature 1: HR Executive Dashboard (Analytics & Stats)**

* **The Logic:** HR needs a "bird's-eye view" of the company’s health across all branches.  
* **Key Stats (KPIs):**  
  * **Attendance Overview:** Percentage of employees Present, Late, or Absent today (with a branch-wise toggle).  
  * **Leave Pipeline:** Number of pending leave requests requiring immediate action.  
  * **Penalty Summary:** Total fines collected/applied in the current month.  
  * **Staff Count:** Total active employees categorized by Department and Branch.  
  * **Birthdays/Anniversaries:** Upcoming employee milestones for culture building.

**Feature 2: Digital Attendance Ledger (The "Master Sheet")**

* **The Business Problem:** Physical registers are hard to track and centralize across branches.  
* **The Solution:** A high-speed digital grid for Branch HR.  
* **The Flow:**  
  1. **Branch-Lock Logic:** Branch HR opens the daily sheet. It only lists employees assigned to their specific branch.  
  2. **Entry:** As people arrive, HR enters the "Check-in" time.  
  3. **Late Logic:** If a shift starts at 9:00 AM and HR enters 9:15 AM, the system flags the row as RED (Late) while respecting the pre-defined grace time.  
  4. **Submission:** At the end of the day, Branch HR "Submits" the sheet to the Head Office. Once submitted, the branch can no longer edit the data without HO permission.

**Feature 3: The Penalty & Fine Engine**

* **The Business Problem:** Deductions are often forgotten or disputed at month-end.  
* **The Solution:** Immediate transparency with HO oversight.  
* **The Flow:**  
  1. **Configuration:** HO HR defines global "Rules" (e.g., Late arrival \= 500 PKR).  
  2. **Proposal:** Branch HR selects a local employee and "Applies" a penalty based on the rules.  
  3. **HO Approval:** The penalty remains "Pending" until Head Office HR reviews it.  
  4. **Real-time Alert:** Once HO approves, the employee gets a notification on their sidebar. This creates a clear digital trail.

 

**Feature 4: Leave & Capacity Management**

* **The Logic:** Managing "Office Capacity" to ensure departments aren't understaffed.  
* **The Flow:**  
  1. **Visibility:** HR sees a calendar view of who is already on leave within a specific branch or department.  
  2. **Conflict Check:** If too many people from one team (e.g., IT) are off, the system flags a "Capacity Alert."  
  3. **Approval:** HR approves/rejects based on these operational needs.

**Feature 5: Unified Employee Onboarding & Credentialing**

* **The Logic:** Creating a digital identity for the whole ERP.  
* **The Flow:**  
  1. **Data Entry:** HR enters core details (Personal info, Medical records, Emergency contacts, Job details).  
  2. **Access Provisioning:** HR assigns a Branch, Department, and Role.  
  3. **Automatic Account Creation:** Upon saving, the system generates a unique User ID and temporary Password.  
  4. **Credential Delivery:** The system generates a PDF/Email for HR to give to the new hire for their first login.

**Feature 6: Organization & Department Management**

* **The Logic:** Reshaping the company structure (Branches and Departments) digitally.  
* **The Flow:**  
  1. **Branch Setup:** HO HR adds/edits office locations (e.g., "Karachi Branch," "Lahore Branch").  
  2. **Department Hierarchy:** HR adds new Departments (e.g., "Operations," "Sales") and maps them to specific branches or as "Cross-Branch" entities.  
  3. **Designations:** Defining titles (CEO, Manager, Intern) within those departments.  
      

**3\. Module: The Employee Portal (The "Standard User" Side)**

Every person in the company—from the CEO to the Sales Executive—uses this journey.

**Feature 1: Digital Attendance Verification (The "Signature")**

* **The Flow:**  
  1\. The employee sees a notification: *"HR marked you as 'Present' (Late) at 9:20 AM. Please verify."*  
  2\. The employee clicks **"Verify/Acknowledge."**  
  3\. **Business Logic:** This acts as a digital signature. If the employee thinks HR made a mistake, they don't click verify; they go to the HR desk to fix it. This eliminates "I was actually on time" arguments during payroll.

**Feature 2: Leave Self-Service & Balance Tracking**

* **The Flow:**  
  1. **Balance View:** Before applying, the employee sees their "Wallet." (e.g., 10 Casual Leaves remaining, 5 Sick Leaves).  
  2. **Request:** They fill out a form (Date \+ Reason).  
  3. **History:** They can track the status (Draft \-\> Pending \-\> Approved).

**Feature 3: The Penalty Transparency Tab**

* **The Flow:** Employees can see a ledger of all fines.  
  * *Why?* It builds a culture of accountability. They can see exactly why their salary might be lower this month.

**Feature 4: Official Announcements**

* **The Flow:** A dedicated feed. Unlike an email that gets lost, these are "Pinned" notices. Once an employee reads it, it marks as "Read" for HR to track who has seen the memo.

**Feature 5 (Global): Security & Personal Settings**

* **The Logic:** Security is a shared responsibility.  
* **The Flow:**  
  1. Users have a **"Settings"** icon in the Sidebar.  
  2. **Password Management:** Users must change their temporary password on first login and can update it anytime for security.  
  3. **Profile View:** Users can view (but usually not edit) their medical and personal info to ensure HR has the correct data.

**Feature 6: The "Office Phonebook" (Company Directory)**

* **The Logic:** Centralizing utility contacts to stop the "Who do I call for X?" interruptions.  
* **The Flow:**  
  1. **Central Directory:** A searchable list of **Departmental Extensions** and **Office Landlines** (e.g., IT Support, Maintenance/Admin, HR Front Desk, Pantry/Peon Station).  
  2. **Role-Based Visibility:** Employees see the numbers they need. They don't see personal mobile numbers unless the contact person has marked them as "Public."  
  3. **Branch-Specific View:** By default, an employee sees their own branch's directory, but they can toggle to "Head Office" or "Other Branches" if they need to coordinate across locations.

**Feature 7: The Employee Personal Dashboard**

* **The Logic:** The first screen an employee sees after the Launchpad. It summarizes their "Professional Health" so they don't have to navigate through menus to find basic info.  
* **Visual Components (Widgets):**  
  * **Attendance Summary:** A circular progress chart or cards showing "Present Days," "Late Arrivals," and "Absent" for the current month.  
  * **Leave Wallet:** A quick-view card showing remaining balances (e.g., *Casual: 4 left*, *Sick: 2 left*).  
  * **Active Penalty Alert:** If a new penalty was approved by HO, a prominent alert box appears until the employee acknowledges it.  
  * **Upcoming Holidays:** A countdown or list of the next 3 company-wide holidays.  
  * **My Activity Logs:** A simplified feed showing recent actions (e.g., "You applied for leave yesterday," "Attendance verified at 9:10 AM").  
  * **Quick Action Buttons:** Large, accessible buttons for **"Apply Leave"** and **"View Company Directory."**

 

# Tab 2

# **TRACK360 ERP: Functional Blueprint (V1.2)**

## **1\. The Global Ecosystem (The "Shell")**

*Remains as previously defined: App Switcher, Dynamic Access, and Universal Sidebar.*

---

## **2\. Module: Human Resources (The "Admin" Side)**

### **Feature 1: HR Executive Dashboard (Analytics & Stats)**

* **KPIs:** Attendance (by Location/Project), Leave Pipeline, Penalty Summary.  
* **Budget Overview:** Salary burn-rate categorized by the Parent **Department** (e.g., IT Dept's total salary cost, regardless of where staff is posted).

### **Feature 2: Dual-Layer Org Structure (Parent vs. Posting)**

* **The Logic:** An employee belongs to a "Parent Dept" (who pays them) but works at a "Posting Dept/Location" (who manages them).  
* **The Flow:**  
  * **Parent Dept:** Responsible for the budget, base salary, and final payroll approval.  
  * **Posting Dept (Project Site/Client Building):** The local Sub-HR at this location marks attendance, records daily penalties, and adds leave comments.  
  * **Visibility:** Both Parent HR and Posting HR can view the employee’s profile, ensuring seamless coordination.

### **Feature 3: Digital Attendance & Sub-HR Sync**

* **Branch/Location Lock:** Sub-HR at a project site only sees staff posted to that specific location.  
* **HO Sync:** At month-end, the system aggregates all attendance from various "Posting Depts" and sends a consolidated report to the "Parent Dept" HR for payroll processing.

### **Feature 4: The Penalty, Transfer & Asset Engine**

* **Automated Salary Calculation:** The system takes `Base Salary - (Calculated Penalties + Unpaid Leaves)` to generate a draft payroll sheet.  
* **Asset Management:** A dedicated tab in the employee profile to track company property (Car, Laptop, Bike, Fuel Cards).  
  * *Business Rule:* When an employee’s status changes to "Resigned," the system triggers a checklist to verify the return of these assets.  
* **Transfer History:** Tracks movement between departments (e.g., "Transferred from Sales to IT in Oct 2025"). Maintains a timeline of how long they served at each location for seniority/promotion logic.

### **Feature 5: HR-to-Finance Automated Hand-off**

* **The Logic:** Eliminate manual data entry for Finance.  
* **The Flow:** 1\. HR verifies the final salary sheet (post-deductions). 2\. HR clicks **"Submit to Finance."** 3\. Finance receives a "Payroll Batch" for approval. Once Finance approves, the budget is deducted from the respective Parent Department's account.

### **Feature 6: Leave & Capacity Management**

* **Parent-Posting Coordination:** If a Posting HR (at a project site) adds a comment on a leave ("Highly recommended due to illness"), the Parent HR (at Head Office) sees it immediately to make the final approval.

### **Feature 7: Unified Onboarding & Credentialing**

* *As previously defined in V1.1 , including Branch/Location assignment.*

---

## **3\. Module: The Employee Portal (The "Standard User" Side)**

*As previously defined in v1.1.*

# Tab 3

# **TRACK360 ERP: Functional Blueprint (V2.1)**

## **Integrated Sales, Inventory, Operations & Finance Logic**

### **1\. The Matrix Structural Logic**

The system operates on a grid. Every entry in the database must identify:

* **The Horizontal (Who did it?):** The Department/Role (e.g., Sales, HR, Finance).  
* **The Vertical (For what?):** The Product or Project ID (e.g., Tracker Sale, CCTV Project).

### **2\. Phase-Wise Operational Flow (Step-by-Step)**

#### **Phase 1: Sales & CRM (The Entry Point)**

* **Step A: Lead Generation:** Sales Executive enters potential client data into the CRM.  
* **Step B: Quotation:** Sales Manager defines the scope.  
  * *Case 1 (Product):* e.g 50 Trackers for customer, CCTV Installations etc.  
  * *Case 2 (Service/Project):*Customer Service or Software Development.  
* **Step C: Project Activation:** Once "Won," the system generates a **Unique Project ID**.

#### **Phase 2: Operations & Requisition (The Fulfillment)**

* **Step A: Resource Planning:** Operations Manager assigns specific Employees to the Project ID.  
* **Step B: Requisition (PR):**  
  * *Case 1 (Client Inventory):* Project Admin raises a **PR** for project materials (e.g., 50 CCTVs).  
  * *Case 2 (Internal Assets):* Project Admin raises a **PR** for staff tools (e.g., 3 Laptops for developers).  
* **Step C: Support & Complaints (After-Sales):**  
  * **Ownership:** The **Sales/CRM** module owns the data intake. A Support Agent opens a **Service Ticket** linked to the Customer and Project ID.  
  * **Action:** The ticket appears on the **Operations** dashboard for assignment.

#### **Phase 3: Purchasing & Inventory (The Acquisition)**

* **Step A: Procurement:** Purchase Dept (Finance) converts PR →  PO→ GRN (Goods Received Note).  
* **Step B: Inventory Allocation (Stock Out):**  
  * *Case 1 (To Customer):* Items "Stocked Out" to client. Triggers **Sales Invoice**.  
  * *Case 2 (To Employee):* Items (Laptops/Cars) "Stocked Out" to **Employee ID** as "Active Assets."  
  * *Case 3 (Maintenance):* Spare parts "Stocked Out" to a specific **Service Ticket ID**.

#### **Phase 4: The Field Service "Digital Handshake" (Validation)**

This phase ensures the Technician's work is verified before any payment or closure.

* **Step A: Execution:** Technician performs the repair/install and logs parts used.  
* **Step B: The OTP Handshake:** The Technician clicks "Complete." The system sends a **4-digit OTP** to the Customer's phone.  
* **Step C: Customer Verification:** The Technician must enter that OTP into the app to prove the customer is satisfied.  
* **Step D: Visual Proof:** Technician uploads a photo of the completed work and a digital signature from the customer.

#### **Phase 5: Finance & Payroll (The Settlement)**

* **Step A: Invoicing & Collection:** Finance issues the bill.  
  * *Verification:* If the Technician collects cash, a "Virtual Debt" is placed on their ID until they deposit it and Finance clicks **"Reconcile."**  
* **Step B: The Commission/Incentive Trigger:**  
  * **Sales:** System calculates commission when the Client Invoice is "Paid."  
  * **Technicians:** System calculates "Visit Fees" only after the ticket is **Closed & Settled** (OTP verified \+ Payment reconciled).  
* **Step C: Final Payroll Integration:**  
  * **HR:** Provides Base Salary \- Penalties \- Unpaid Leaves.  
  * **Finance:** Adds Project Commissions \+ Service Visit Incentives.  
  * **Output:** One consolidated Payslip.

### **3\. Special Asset Logic: Vehicles (Cars/Bikes)**

* **Assignment:** Linked to Employee ID (Inventory Stock Out).  
* **Maintenance Log:** Operations records Fuel Bills and Service Dates against the Vehicle Asset ID.  
* **Recovery:** If HR marks an employee as "Separated/Resigned," the system flags the Vehicle as "Pending Return" in the HR Exit Checklist.

### 

