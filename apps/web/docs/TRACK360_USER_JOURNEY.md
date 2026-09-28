# ESSPL ERP - Portal-wise User Journey

Updated: 18 September 2026. React frontend + Node backend + PostgreSQL. Is update mein quotation SMTP email aur client approval ka naya flow shamil hai; .NET project shamil nahi hai.

## 1. Shuru karne se pehle - Login aur SMTP

### Chaar main portals
- CSR / CRM: client, quotation, approval aur order.
- Inventory: token, stock, purchase order, receiving, dispatch aur field-job reconciliation.
- Finance: billing review, final invoice, PDF, summaries aur accounts.
- Super Admin: sab portals, user management, logs aur existing EMS.

Installer ka kaam Inventory ke andar hai; separate fifth portal nahi hai. Joint Inventory/Finance admin ko dono workspaces ka access milta hai.

### Login
Local testing ke liye `http://localhost:8080/login` kholein. Har kaam ke liye us portal ke authorized account se login karein.

### Email bhejne se pehle administrator ka kaam
Backend `.env` mein sender ki SMTP settings configure karein: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` aur `SMTP_FROM`. Password chat ya GitHub par share na karein. Provider ke mutabiq app-password use karein.

`PUBLIC_APP_URL` mein client-accessible HTTPS frontend URL set karein. External client ke email mein localhost link nahi jana chahiye; localhost us client ka apna computer hota hai. Settings badalne ke baad backend restart karein.

- Port 587: STARTTLS, `SMTP_SECURE=false`.
- Port 465: implicit TLS, `SMTP_SECURE=true`.
- Client record mein valid email mandatory hai.
- Production mein `SMTP_ALLOW_LOCAL=false` rakhein.

### Abhi configuration ka status
SMTP feature implemented hai aur local SMTP capture test pass hai. Real sender credentials aur public frontend URL abhi configured nahi hain. Isliye real client inbox delivery abhi verified nahi hai. Neeche email-send steps configuration complete hone ke baad use karein.

## 2. CSR / CRM - Client se email approval tak

1. Client ki requirement receive karein aur CSR / CRM portal mein login karein.
2. `Clients` mein existing client check karein. Naya client ho to `Add Client` mein name, contact, valid email, phone aur address save karein.
3. `Create Quotation` kholein. `Select Client` ke searchable dropdown se client choose karein; client ka email bhi check karein.
4. `Add Product` se catalog item choose karein. Price tier ke mutabiq price load hogi; quantity aur price review karein.
5. Catalog mein item nahi hai to `Add Custom Item` se description, quantity aur price enter karein. Yeh existing-stock product select karne se alag hai.
6. GST preset ya custom percentage select karein. Subtotal, GST aur Grand Total review karein.
7. Sirf save karna ho to `Save as Draft` click karein. Draft par email nahi jayegi.
8. Client ko bhejna ho to `Generate & Send` click karein. Backend quotation/items save karta hai aur unique `QT` number banata hai.
9. Backend client ke saved email par quotation items, totals aur `Review Quotation` approval link SMTP se bhejne ki koshish karta hai.
10. Quotation Detail par result dekhein: setup pending ho to neutral manual-sharing message aur `Copy Client Link`; SMTP acceptance par `Email submitted to ...`; configured sender ka actual send fail ho to `Email not sent: ...`.
11. Filhaal `Copy Client Link` se approval link manually share karein. Setup pending ho to Retry Email button nahi dikhaya jata. Setup complete hone ke baad retry available hoti hai; quotation dobara create na karein.
12. Client shared link khole. SMTP connected ho to inbox/spam mein received email ka `Review Quotation` link khole. Client ko ERP login nahi karna hota. External clients ke liye accessible public URL mandatory hai.
13. Client items aur amount review karke `Approve Quotation` click kare. Approver name optional hai.
14. Changes chahiye hon to client reason likh kar `Reject Quotation` click kare. Rejection reason mandatory hai.
15. Backend usi quotation ka decision PostgreSQL mein save karta hai aur audit record banata hai. Approval par `APPROVED`; rejection par `REJECTED` hota hai.
16. CRM List/Detail visible ho to har 2 seconds mein approval-status check hota hai; tab focus par bhi refresh hoti hai. Backend/network response ka waqt iske ilawa ho sakta hai. CSR ko manually mark-approved nahi karna hota.
17. Approved quotation par `Convert to Order` click karein. Agar linked order pehle se bana hai to `View ORD-...` use karein; naya duplicate order na banayein.
18. Order CRM `Orders Tracker` aur Inventory `Incoming Orders` mein linked client/items ke saath dikhega. Rejected quotation par `Edit & Resend` se correction karein.

### Yaad rakhein
Quotation status `SENT` aur email delivery status alag hain. Quotation saved/SENT ho sakti hai lekin email `FAILED` ho. `Email submitted` ka matlab mail server ne accept kiya; inbox pahunchna ya client ka read karna isse prove nahi hota.

Draft/expired quotation ka public approval blocked hai. Repeat same final decision safe hai aur conflicting decision blocked hai.

## 3. Inventory - Order se completed job tak

### Token, stock aur purchasing
1. Inventory portal mein `Incoming Orders` kholein aur linked client/order select karein.
2. `Generate Token` click karein. `TKN` number banega aur order ki stock readiness check hogi.
3. `STOCK_OK` ho to `Field Service Dispatch` ready queue mein jayein. `AWAITING_STOCK` ho to missing stock ka `Create PO` flow use karein.
4. PO mein CRM reference aur shortage items review karein. Supplier woh vendor hai jisse samaan khareedna hai; client supplier nahi hai.
5. Supplier, delivery date aur adjustable GST review karein. Zarurat par items add/remove karke PO save karein.
6. Samaan physically aane par `Receive Stock` click karein aur received quantities confirm karein. Sirf PO save karna stock receive karna nahi hai.
7. Stock/PO status update hota hai. Fully received PO ka Receive Stock action disabled/light hota hai. Partial receiving ho to remaining quantity check karein.
8. Tamam shortages clear hone par linked job Dispatch Ready Queue mein aati hai. Receive Stock se customer ka final bill seedha Finance mein nahi jata.

### Dispatch aur actual site result
9. `Field Service Dispatch` mein ready job ka `Prepare Assignment` click karein. Queue empty ho to Incoming Orders/token aur remaining shortages check karein.
10. Loaded client, items aur address review karein; installer select karke `Confirm Dispatch` click karein. `DSP` record banta hai aur issued stock record hota hai.
11. Active dispatch row ka `Complete Field Service` kholein. Har item ka actual result select karein: `Installed / Given` ya `Not Used / Return`.
12. Sab items mark hone par `Complete Field Service & Submit Reconciliation` click karein. Installed product ko return mark na karein; client ko mil gaya ho to Installed / Given choose karein.

### Finance handoff ke do raste
- Koi physical return nahi aur chargeable amount hai: completion par bill automatically Finance mein ja sakta hai. Success message `Next: Finance > Billing Approvals` dekhein.
- Return items hain: Inventory `Field Reconciliation` mein request review karein. Qty/condition aur actual returned items confirm karein, `Confirm Reconciliation` click karein, phir `Submit Verified Billing Record` click karein.
- Good physical return available stock mein wapis aata hai; damaged/used item ko available stock na samjhein.
- Sab chargeable items return hone se final bill 0 ho: `Close as No Charge` flow use hota hai; payable Finance invoice generate nahi hoti.

Returns table mein return quantity 0 ka matlab item return nahi hua; iska matlab invoice amount 0 hona zaroori nahi. Token/PO/dispatch number se linked record verify karein, sirf client name se nahi.

## 4. Finance - Bill se final invoice aur summary tak

1. Finance portal mein login karke `Billing Approvals` kholein. Quotation approval ya stock receipt ke bajaye completed/reconciled job ka bill yahan aata hai.
2. Client, token ya order reference se bill dhoondhein. Pending/All status filter check karein.
3. Bill detail mein installed items, return deductions, extra additions aur final adjusted amount review karein.
4. Expense type aur invoice details/format select karein. GST jahan adjustable field hai wahan correct rate enter karke totals dobara check karein.
5. `Approve & Generate Invoice` click karein. Issued invoice apne alag full-page view mein khulegi aur Finance `Invoices` list mein bhi aayegi; linked order invoice progress bhi update hoga.
6. Pehle se approved bill par `View Invoice`, ya `Invoices` list mein `View` use karein. Client, branch/code, PO reference, date, NTN/GST aur line amounts review karein; missing data ko guess na karein. Bill review aur invoice ab alag pages hain.
7. Correction ho to invoice `Edit` use karein aur save karein. Delete/cancel sirf allowed action aur confirmed business need par karein.
8. Invoice page par `Print / Save PDF` use karein. Browser print dialog mein `Save as PDF` select karke final invoice save karein aur downloaded file khol kar check karein.
9. `Summaries` kholein. Relevant client, month/date period aur expense-type filters select karein.
10. Invoice rows, totals aur summary preview review karein. Correct client/period ki summary `Print` / `PDF` se save karein.
11. Invoice edit/delete ke baad summary refresh karke totals dobara check karein. Invoice ledger aur Accounts mein linked amounts bhi review karein.

### Configurable Invoice Builder
Custom template chahiye ho to `Invoice Builder` mein client/template select karke rows, columns, header/footer aur formulas review karein; preview ke baad draft save karein. Workflow-linked billing ke liye Billing Approvals wali journey ko skip na karein.

### SMTP ki boundary
Is SMTP update ka automatic email feature CRM quotations aur unke client-approval links ke liye hai. Final invoice/summary email sending ko is change ka verified feature na samjhein. PDF download/print aur quotation SMTP do alag actions hain.

## 5. Super Admin - Monitoring aur existing EMS

1. Super Admin account se login karein; Admin Dashboard mein combined KPIs aur alerts review karein.
2. CRM, Inventory aur Finance overview/detail modules khol kar respective linked records dekhein. Har operational table ko ek dashboard par fit karna mandatory nahi hai.
3. `User Management` mein authorized role/permissions assign karein. Inventory/Finance joint account ko dono operations ka access hota hai; yeh naya independent portal nahi hai.
4. All Orders Tracker mein client se invoice tak same order/token ki progress check karein.
5. System/Audit Logs mein email-send success/failure aur client approve/reject actions review karein. Audit records read-only hain.
6. Existing EMS modules - Employees, Attendance, Leave, Penalties, Announcements, Calendar aur Directory - apni authorized access ke saath use karein.
7. SMTP credentials aur backend configuration administrator manage kare; normal client ko sender password ya internal settings nahi dikhni chahiye.

### Portal change karte waqt
Har operator apne authorized account se apna kaam kare. Super Admin ka full access normal CSR/Inventory/Finance user ki permissions ka proof nahi hota. Record ko client name ke saath quotation/order/token reference se match karein.

## 6. Quick flow, troubleshooting aur test evidence

### Ek nazar mein full journey
Client requirement -> CSR client select/register -> quotation + GST -> Generate & Send -> SMTP email result -> client public-link approval -> CRM approval saved -> Convert to Order / existing order -> Inventory token -> stock check -> PO/Receive Stock if needed -> Prepare Assignment/Confirm Dispatch -> Installed or Return result -> Complete Field Service -> return review if needed -> Finance Billing Approvals -> issued invoice -> PDF -> client/period summary.

### Agar cheez nazar nahi aa rahi
- Client ko email nahi mili: client email, quotation ka email delivery result, SMTP settings, inbox/spam aur public URL check karein. Failed ho to Retry Email use karein.
- Client link nahi khul raha: public frontend deployment/HTTPS aur backend connectivity check karein; external client ke liye localhost use na karein.
- Client ne approve kiya lekin CRM purani hai: tab focus karein; visible page har 2 seconds mein status check karti hai. Network/backend slow ho to response ka extra waqt lagega. Zarurat par Refresh use karein; API/backend error resolve karein.
- Dispatch queue empty hai: order converted hai? Token bana? Stock complete hai? Kya dispatch pehle se Active Dispatches mein hai?
- Finance mein bill nahi: job complete hai? Physical returns ka confirmation aur Send Adjusted Bill action complete hai? Kya record No Charge hai?
- Invoice amount 0 hai: empty items, zero prices aur all-returned/no-charge result alag reasons hain. Installed chargeable items ke bawajood zero ho to issue investigate karein; usko normal na samjhein.

### 18 September 2026 ko kya verify hua
- Actual browser clicks: Generate & Send, mobile client approval aur CRM auto-refresh.
- Local SMTP connection: quotation items/totals/link accepted; failed-recipient send aur Retry Email bhi tested.
- PostgreSQL: email status/message ID, approval/rejection aur audit records persisted.
- Invalid draft decisions aur conflicting final decisions blocked.
- Setup-pending manual-link UI: neutral message, hidden retry aur manually opened link se approval persistence tested.
- Automated suites: backend 167 tests, frontend 144 tests pass; production build pass; database migrations applied.

### Abhi kya claim nahi kiya ja raha
Real client inbox delivery SMTP credentials/public URL ke baghair verified nahi hai. Yeh update poori Inventory-to-Finance journey ka naya live retest nahi tha; upar uske operational steps hain. Full project TypeScript check clean nahi hai. Isliye poore ERP ko 100% error-free declare nahi kiya ja raha.

Next verification: authorized test recipient par real-provider email bhejein, inbox/spam check karein, us received email se approval click karein, phir CRM/database ka saved status confirm karein.

