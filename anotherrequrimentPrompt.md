Okay, so here's the thing I want you to know, okay? I'm not just creating a simple card operations website. I am
creating a dashboard, a management portal, an ERP system. You also have seen in my prototype folder that the main
dashboard for every role, like for employee, HR, or admin, they are very much professionals. Some mistakes, some
padding, some things that are not, that aren't supposed to be there are still present, but it's a prototype. It's not a
fully functional and ready project, product, ERP system, anything you say. So I want you to copy exactly all the things
that I am telling you right now. Implement all the things, even in backend, in front-end, or and in database. Create
migrations and in database. First, for super admin, I am not seeing... At dashboard at all. Seriously, like, I am
not seeing a dashboard at all. In the super admin dashboard right now that you made in the final underscore product
folder. I am just wrongly seeing in the dashboard three card div. One is saying attendance marked today. Another is saying
pending leave requests. Another is saying employees and the total number of employees. But what I want, total employees
card, present today with the percentage rating from total, like how many are present from total. And total in total
card, I want to see how many are total and how many have new joined, like plus 6 this month, plus 10 this month, plus 20
this month, with a simple ratio in the right corner as you are seeing, as you can see in prototype dashboard for super
admin and for HR, because super admin and HR have 90% same dashboard. Only the configuration setting is for super admin.
So, I want it like this. In top, you can see in the prototype folder, we have four sections at top with total employees and
the percentage of how many plus how many percentage got. and how many numbers and how many departments, like six plus
this month and five departments. Also, decide that card. I am seeing another card present today where I can see all of
the present employees with the ratio from total. Okay, like from total and how many present, we will show the ratio of
that, the percentage of that. And also, another card decided is how many are on leave today with three pending and nine
approved, for example. Okay, and another card showing penalties, how many penalties in total for this month. Example,
like 4,500 rupees in March and 12 records, like 12 penalties has been made for some employees. And I don't want the add
employee button in home dashboard, okay? And after it, we have quick actions button.Quick action buttons let you do and
redirect to that page without much effort from like going to the nav bar and click on add employee, then you go to the
employee page. Like directly click these buttons, then you will go to the respective places, okay? I want quick action
buttons for leave approve, approve leaves, mark attendance, add employee, record promotion, and add penalty. And a whole
section like you can see in prototype folder. See it, fully copy it, ask me questions about it if you are in some
confusion. Also, I want a notification in navbar. I want a notification icon when click on it, it will show all the
notifications for employee. It will show for only employees about their notifications, like what changes have been made.
If employer have placed the attendance, it will show there. If there are some news, anything announcement, we will do
announcement later. But we will add the notifications right now. So, add notifications, then add a small another card
right beside the quick actions or down there anywhere, just like prototype, but enhanced because the prototype folder is
just a simple prototype. I want much more advanced and fully featured and full professional UI plus integrated thing. I
don't want any AI flop things like you got what AI flop I'm talking about. All the AI flop things like adding emoji, the
gradient color, the button with very bright shadow and radius like that. Same radius on all the buttons, things like
that. I want it fully professional, but I'm not telling you to fully focus on UI. The only thing I am telling you is
copy the same UI from the prototype, but add much and many more features than the actual prototype. Add pie charts and
other charts that you are seeing in the... Dashboard, the monthly attendance that I told you, just make a small route
service middleware because database is already have all these, we just need to filter out things. So it will show last
six months, last 12 months, and we can select many more like that. Okay? From dashboard, it will only show last six
months and last 12 months in a drop down, like shown in the prototype folder. Also the head count like how many
employees we got on October, now on November and December, and January, February, March, like that. And the birthday
calendar. We can create the birthday calendar right now because we are saving employee birthdays, right? When entering
employee, we are creating, when creating a new employee, we are adding employee date of birth. So we can get the
employee date of birth by that. So only some route, middleware configuration, only some new route, new function, new
model. Only some new functions have to create with protected routes and other all the required things after creating the
model, then service function, then controller function, then route function. So things like that, okay? So right now,
for the calendar section, we will show only the birthdays, okay? We cannot show the holidays right now. And forget the
leaves too. We will not show leaves in global because it's a little privacy issue. If someone is on leave, they don't
want everybody to see it. If some HR and his department had known, then more to him. I will discuss that in the meeting
with stakeholders, but that's not what I want according to me right now. So let's leave the leave thing. Okay? Also, a
small section which will show exactly like beside a small card function that's saying birthdays and anniversaries. I
don't know about anniversaries. I think company anniversary or things like that, but it will come under the calendar and
announcement feature. So let's forget that. Add a card. No, sorry. Right now, just show birthdays, okay? And with all
the employees' names and in which date it is on, like Thursday, 7th May, and how many days from today are left. Okay,
with a proper icon, not some emoji. Okay, and let's forget the announcement section. Add a small faded text on top of it
saying, coming soon, okay? And for the pending actions in the bottom card, create that one. Okay, the pending actions.
Section the record will be also required right now. Okay? It will show everything, like if some employee is missing
their some fields, for example, their banking detail or their emergency phone number, because something, many fields are
not required, but still company needs it. Not when creating the employee, but after that, they still need it. HR needed
it, company needed it, so make for it, okay? Because if we have to contact their family members or anyone that will have
to be present on emergency number, how will we contact if some emergency happened to them? Okay, so we have to take care
of it too because it's an ERP, Enterprise Resource Planning system, okay? Also, we have another section right beside
that which will be urgent alerts, which will show all the alerts, like if some... if an employee internship is about to
end, or contract is about to end in 3 weeks, 2 weeks, 1 month, 3 days, 10 days, 5 days, anything, any number, someone
probation period is ending, and if someone information is missing, or someone is absent, leave that alerts, alert,
urgent alerts for later. When we do the, when we do the calendar, global calendar thing and announcement thing, leave it
with them, okay? And the recent activities, leave that also, okay? Leave the recent activities where we will show if
someone leave was approved, we will show their role, who approved that, if they are super admin, if they are HR, or
things, people like that. We will show the date, we will show the name, we will show the year, like that. And on the
employees page in prototype, I have a clear visual and user-friendly interface, but in my screen, I don't have that kind
of interface. I specifically tell you to create these things, keep these things in mind for the dashboard. So for the
employee section, employee's page, first there will be a search by name or ID input field where an employer, whatever
it's HR or super admin or someone that have access to it, they can search an employee. We have pagination. We have some
filtered drop-downs where we can select department-wise, status-wise, and working mode-wise, and working location-wise.
We can also, HR can also search that. HR can search that, okay? HR can also have the... that they can see if all the
terminated ones that are terminated, the resignation ones, or like that, okay? With the specific things I have told you
before, and also that is written in the README.md file. I have told you that to make the action button and all the
respective fields, table and columns for the employee page that I have told you. It will be in README.md file where I
say it will show employee name, employee ID, department, designation, type, if he is a full-time, part-time, internship,
probation, and what shift he is attending, and his status, if he is active, terminated, and joining date, when did he
join the office, and with some action buttons, like the view button where we can view all the information by sections.
Specifically, I have told you all these things in README.md file. How this action will look on, it won't bulk, like it
will show the information by demand. When I click the medical info, it will get the, it will invoke the medical info
request and then it will show me. It won't load automatically. What if I only want to see his job info and the all
requests go at the same time? The system will go down. The system will be slow. The system won't be efficient. So we
will make it by demand. Okay. Also, we can, we have buttons like in prototype. You can see in prototype, in employees
page, and in employees, we have for specific employee page that we can view. We can also click a button, edit, and all
the details of the employee will be shown there and we can select all that information. Okay, okay, I get your point.
You will say that we don't have the job info, medical info, payslip, promotion, penalty, activities, document. Don't add
that, but make an interface like that. What you have made aren't looking like that. Correctly and exactly. I want you to
make it like that. We have quick action button that we can do multiple things, add penalties to it, or any other actions
like that. Okay? All the things like that in the prototype folder. I am telling you again and again and again that the
prototype folder has everything I need, but it's written in React vite plus...Plus, they are all client-side. I want
some pages that doesn't need any interaction. I want them to be server-side so that we can put more hard and more things
on client and reduce the load from client-side to server-side. Okay, review all the pages. If some pages are not present
and I have not told you to create them, just add these things, but add a small faded text on top of that and blur the
background of it saying coming soon. Okay? All the things in the sidebar, in the side navbar, we have directory,
penalties, promotion, payroll, things like that. Also, why haven't you added the configuration table for the super
admin? If all the routes, all the middleware, all the RBA are created, role-based access system, why are we still
waiting for... Why haven't we still completed that? I want you to make a comprehensive plan reflecting full, full, full
components from prototype and making them interactive and... responsive and functional and much more functional than the
prototype holder because I have already shown the prototype to the stakeholders. If I will show them the same interface
again with the same features, they will be like, what the hell? We want the thing you showed us was merely a prototype.
We want a more efficient and much more interactive with better UI and things like that with features, with
functionality, with performance. We want that. We don't want your bullshit prototype thing, okay? So I want you to first
fully focus on functionality and the basic UI from the prototype. After I fully mimic all the prototype things like
adding all the functionalities like prototypes, then I will start making the extra features by one by one. After
creating a full functionality, then I will move on to the UI section and the designing section and performance section
and SEO, things like that. They are later. We will make it. We will build it by time by time. We are not. force to build
it today right now, no, we are built, we will build it after some time. We don't want the product to be ready in one
day. It will be chaos and all the things will break because and we Can not deliver a product in one day, okay? All the
UI are already pre-made, some little adjustment with the routes and other things are required. So, just copy-paste full
UI, make the super-admin and HR home dashboard page, that home dashboard page navbar that have input field in it, where
they can search employee by name. They will search employee by ID or by name, like with EMP002 and name will be that
Khan. So, all of their records will be shown in the dropdown, in the search menu. Everything of that employee will be
shown in the search menu, like Google, when you search something and Google shows suggestion, like that. And when we
click on that, if we click on that attendance in the suggestion, we will be redirect to that attendance in the
attendance page, like in attendance, we can see someone's attendance, right? So, we will redirect to that page. If I
show you example, if we go to view employee and we go to attendance section, we will see all of it, attendance. We have
to add the filter bars in here too, by month, okay? Not by weeks, not by days, by month. And all the months from the day
the employee was present, it will be shown up here. Understand? I don't know what you will do, and I suggest to use the
queries for it. If I'm viewing an employee EMP001, it will show me the whole page, and the queries will be like showing
personal info, something like that in the query. And when I click on the job info, it will show the job info and the URL
will be changed and will be job shown in equal job query, anything like that. You know better than me, okay? You are a
better engineer than me, but I am giving you a suggestion. And same for the attendance, use this method on the home, on
the dashboard search bar for other things, report, penalties, for later. We will do that. We will make search bar for
right now for attendance, leave, and yes, for right now we need these. After that, we will add multiple other things
like payroll, promotion, penalties. And so on and so on. Okay, you understand? I want you to make all the UIs the same
as prototype, but change something like in the navbar, in any role, if we are on employee, if we are on HR, it's showing
me a little tabs where I can open HR, super admin, and employee, okay? I don't want that in my website, in my software,
in my app, in my final product, okay? Because it's a prototype and I don't want to log in and log out and waste time, so
I did this. But I want you to add a full view for the same thing. And we also have very much things in employee. For
employee dashboard, we have many things, like for the first section card, they will show my name, my department, today's
date, and today's timing, and my employee ID. Okay? And remove any kind of emoji. Because I am seeing right now the
prototype website and it's showing me emojis and emoji in there. First section will be like same like that. Next section
is today schedule. It's showing me shift starting time, ending time and break. We don't have any break right now, so
remove the break. And we don't want check-in and check-out, okay? We only want the acknowledge button here. If the HR
mark our attendance, then we have the acknowledge button and we can enter the or click a button to acknowledge it. And
once we click on the acknowledge, we cannot change it, okay? And it will show us the late. If we are late, it will show
us the late. And if we are not late, it won't show us the late that you are late from this time, this time. These things
are in employee dashboard, okay? Main home dashboard. And we have quick actions for employee where he can apply for
leave for future. He can view payslips. For now, if it's not hard, we can add change password. And employee cannot
update it and his or her profile. Okay, if he wants to do, he can go to for now, he can go to HR table and say that I
want to change my phone number or my or the HR write my name wrong, anything like that. He can simply request for update
profile and the request will be sent to HR and HR will review it and will show it and employee can track everything. But
if very, if this module is for very future, not right now, not currently. Okay, and after that section, we can see
attendance section, a section where we will see attendance, leave balances, pending requests, leave requests, and
payroll. Add a simple fading effect with text saying coming soon, but show, but little, but show very small and less
than that it's saying TKR and last name payflip, like that. Okay? Then we will have a bigger section. After that, we
will have a bigger text box. Sorry, in that, on that section, we have the total present days because we have Sunday and
only Sunday off. So we will have total days 26 or 27 or 25, depend on the month, okay? We will have that and it will
show us out of 23, 24, 25, whatever if the month is 28, 29, 30, 31, okay? So it will show us the total date and will
show us all the days we have come. Then in the leave balance, it will show ourcasually, vertically, and on the pending
request, it will show how many requests are your, are pending, only the leave requests for now. We will improve it very
much, so it's later. But right now, only pending requests. And the last, and the last month payroll or payslip, forget
that Adar coming soon thing, affect our. After that, we have a big section with attendance for last six days. Okay. We
will have attendance. In that attendance, we have check-in, check-out time. We have status, whatever. He was present,
absent, late, or was on leave, and days and dates. You can see all these things in prototype and you can go in pages and
in pages, you have my dashboard, where it will show employee dashboard and so and so. Okay. And beside that, we will
have my leave request card or section, whatever you say. We have that, and in that we can see all of our leave requests
that are approved, pending, rejected, what type of request was it, from, to, to, like, which date was it starting and
for which date it was, how many days, and status, if it was pending, approved, rejected. And we have a small button
where we can, where if we click, we will redirect to my leave space and we will, we have, we can open a more model in
that we can select which leaves we want, annual, casual, manual, and it will show all the things in with remaining dates
and make the calendars like that, that if we select from date, and if we have 7 annual leaves and we want to request
annual leaves from 20, from 20 date, Wednesday and the to will not show us after 7 days of that, okay? It will, the
calendar, if the calendar has custom If you want to create a custom calendar, you can create a custom if the default
calendar have these options, you can use these options. And one if someone try to outsmart and write the dates by
keyboard, it will show when the date input put a on change and when whenever date change, it will check to the from
date, the starting date, and to the selected date. And if that doesn't match the remaining date, it will show error that
you are, it will show the error that 20 like example, 26 days requested exceeds balance of 7. Okay. Also, in the
dashboard, employee can, by clicking the apply leave, the model will be open in the dashboard too. They won't have to go
to the My leave section, My leave page and have to apply for leave or the button won't directly redirect him. A small
model will be open and they can apply for leave from there. Then, They have my team card where they will see all the
members of my team. But it's not in the requirement, it's nowhere to be executed, so add a coming soon on this too. But
clearly showing that what it was. Don't blur it that much that we cannot see it. All the things that I said to coming
soon, don't make it that much blurred that we cannot even see what was behind it and what are we trying to do with it,
okay? After that section, we have upcoming birthdays where we can see all the birthdays from for all the employees.
Also, I want you to add the calendar, birthday, holidays in a big calendar. Create database, backend, frontend, logic,
everything for it, okay? So it's kind of important if we are just showing the birthday, they will ask why not the global
calendar. Also add a simple, small notification because only one table and it will be protected by, it will be only, it
will be a protected route only for login users because employee will see, super admin will see, and HR will see, HR will
see, but only HR and admin. can add notifications to it. And for the global calendar event handler, we say event handler
or global event, something like a calendar. I don't know whatever it is called in the professional world, but make that
calendar do that will show all the global news if it's raining today and people and the employees don't have to call or
message the HR to whatever, whenever. whether they have to come or not. Whether it's the inclement weather or
unauthorized absence or on leave or anything like that, it will be called that by HR, and HR can select these things
from drop-down and he can select date like in prototype. Prototype also have this. We have options like holiday,
emergency, company event, things like that. Okay? We can add title that if it's Pakistan Day, Eid-ul-Fitr, Eid-ul-Adha,
or if it's Labor Day or things like that. Understand? And this module is also in prototype in setting page, and in
setting we have global date. So check it, check this one out too. And why didn't you add the configuration table if we
already created all the things required for the configuration tables, like all the authorization and other things? Add
these too, because all the routes and other things like RBAC are already created. Why aren't we using it already? So use
these already, okay? Only for the HR super admin, only for the super admin, okay? And ask every question you did not
understand. You can ask any question to me that if the leaves or other things, like if employee can see his global, his
balance leaves, then yes, if also super admin and HR have a calendar where they can see all the leaves, approved leaves.
Approved lead employees on a calendar UI. They can see from and to, like starting date to ending date, and which date is
currently on the calendar. Things like that, a simple full calendar, but with employees starting date to ending date and
employee names on them. Okay? And also, for later, not right now, for later, remember to add the company directory
digital phone book to find anyone in the organization, like HR manager, or for engineer, we have senior developer, and
accountables, things like that. Look, man, all the things, all the contacts, all the UI are already in the prototype
folder. You just have to copy that prototype folder UI, paste that in your own, in the final product file, and edit that
file that it uses the, it uses all the All the routes that are created and is ready to use, use all that routes and So,
implement all that and suggest one thing to me. Whether we use server actions in our Next.js app or whether we use
simple request routes, which one is enterprise level, which one is efficient, safe, security-wise, cleaner, simpler, and
which one is more recommended to use? And ask questions if you are unclear and have doubt on anything, even on small
thing that an employee can see this or do employee have rights to see this, things like that. Ask every single question
that you don't understand or you don't, you did not have a clear vision on that thing, okay?"