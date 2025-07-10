# Employee Info Tracker Web App

This repository contains the codebase for a web application designed to track employee information that may not be part of an institution’s official records, but is highly valuable for short-term projects, group collaborations, and internal task assignments.

## Purpose

The app enables teams to quickly reference and manage data about employees such as:

- Certifications
- Skills and expertise
- Project history
- Task assignments
- Any custom metadata relevant to internal team workflows
- Time keeping for work hours instead of Sling that does not require location tracking but requires duration and recording time.

This system is especially useful in dynamic environments where quick access to detailed employee info helps optimize task delegation and project planning.

## Features (Planned / In Development)

- ✅ Single Page Application (SPA) using Next.js
- ✅ Secure login and user authentication
- 🛠️ Admin and team-level views
- 🛠️ Role-based access control
- 🛠️ Custom group overview dashboard

## Tech Stack

- **Frontend**: Next.js (React)
- **Backend**: Node.js / API Routes
- **Database**: MongoDB
- **Deployment**: TBD (Vercel / Docker)

## ToDo

- Add Delete Member Button for admin of the group: Completed ✅: 6/25/2025
- Add button to make the user an admin/give admin previlages: Completed ✅: 6/25/2025
  - Only owner can give that previlages and take it away ✅
  - If the member is an admin then show remove admin previlages (only to owner) button if not then show opposite ✅
- Add button for admin to add/edit certificates or attributes to members of a group in bulk: Completed ✅: 6/27/2025
  - Add certificates and attributes number along with group role (access) and team role (job) ✅
  - Add filtering options based on certifications or custom attributes variables and display the value in a new table with any member with that certification in their membership ✅
  - Add Filtered values delete and edit option for the admin for certifications and attributes ✅
  - Add button for adding certs or attributes in bulk based on selected users ✅
- Add profile page for each users and edit fields and profile delete option: Completed: 6/29/2025 ✅
  - Add similar to member page tables of details in userProfile page with edit details and delete group profile options ✅
- Add Track Hour with location record for each users: Completed:
  - Needs automatic shift hour limit when work starts and saves that as end time if end time is not recorded not recorded ✅
  - Last two weeks work stats bar chart/table ✅
  - Allow a window select for checking hour stats for a user ✅
- Update Added by / edited by in memberPgae tables so that it updates in the databased if the field is modified by anyone new: Completed: 6/30/2025 ✅
- Add task option in the user shcema (in group page assign, display, modify, delete functionality), in user page table of tasks and their status: Completed ✅: 7/1/2025
  - Add tasks schema to user model ✅
  - Add tasks table in user profile and assign task option, edit status and remove tast options ✅
  - Add tasks table and shifts table to memberPage only for admins ✅
  - Add assign task button on member page only for admins ✅
  - Add assign task in bulk in group page for admins ✅
  - Add filter by task and edit filtered tasks for admin option ✅
- Modify the styling to optimize for mobile phone view: completed ✅: 7/1/2025
  - Modified group page ✅
  - Modified member page ✅
  - Modified user profile page ✅
- Fixed NEXTAUTH_URL environment variable missmatch in vercel. Completed ✅: 7/2/2025
- Fixed shift api variable name missmatch (changed memberIds to membersId). Completed ✅: 7/2/2025
- Add delete button to delete a shift only in userProfile page. Complete ✅: 7/2/2025
- Add attributes for the group/notice/announcement kind of thing. Completed ✅: 7/2/2025
- In session authencated checks also check for if the user exists in the database or not.
  - Can't check that in the api because we are allowing for creating new user if user does not exist yet. ✅
  - Added the database check on render in member page. ✅
  - Add check on login page to see if the user is authenticated or not and send back to dashboard if authenticated. ✅
- Added location view map option for shifts table in user profile and member page. Completed ✅: 7/4/2025
- Add ability to add shifts to a task and show total hours for that task.
  - Add task Id array to shifts schema in users model ✅
  - Edit shifts route to initiate taskid array while creating/modifying shifts ✅
  - Edit shift create form to enable task assignment option for new shift start case ✅
  - Allow exsiting shifts table edit option to add or remove tasks from the shift ✅
  - Modify filter by div to include filter by tasks for work shifts table in member page and user profile page ✅
  - Add hours total in group page table with date enabled filter and automatic filter for last week starting saturday. ✅
- Fixes after meeting on Tuesday: 7/8/2025
  - "Fixed the filter by task issue by normalizing the task description before putting in options for drop down and before comparing the drop down value with task descriptions values to maintain consistency" ✅
  - Improve the assign task box font and text box ✅
  - Change team role to position ✅
  - Add multiple emails (dashboard create group and add member function) to group with comma/spaces separated ✅
  - Add edit group name option
  - Add notifications email for assignment and group creation 
  - Attribute value type name change 
  - Create archive for groups 
  - Add profile name circle like oracle 
  - How many days left for a task
- Form creation option by the admin to collect data about members.
- Wrap the tables into a div that is scrollable both horizontally and vertically and only shows 5 rows at a time max.
- Add page not found fallback page when group/member does not exist for group, member , profile page.
- Add hour stats abd bar charts on memberpage for admins only and on userProfile.
- Add select all option for admin in grouppage to add fields to multiple users at a time.
- add hours stats on group page for total group hours stats bar chart
- Add group level stats on the dashboard page for each group: Completed:
- Add button to assign a shift (time) to a task
- convert shifts to a weekly barcharts
  - Need to fix time zone issue if filter option enabled. meaning need time zone variable for all pages

After 7/9/2025

- Add login exporation limit while not in session or other secure logic. Completed :
  - Added browser close session expiration. But browsers stores user session even when closed. ✅
  - Need own data record of session use for proper implementation
- Modify the api routes for efficiency and reduce redundency
- Hall furniture inventory option
- Ultimately could allow a floor plan page to be able to record which room is used for what in the log run plan
- Storage Management inventory
