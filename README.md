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
- Add hour stats abd bar charts on memberpage for admins only and on userProfile.
- Add select all option for admin in grouppage to add fields to multiple users at a time.
- Add login exporation limit while not in session or other secure logic. 
- add hours stats on group page for total group hours stats bar chart
- Add project/task option in the group page (create, modify, delete functionality)
    - Group page will have two tables projects and members
    - Add event dates in the project details 
    - Add project detail page similar to member page
- Add group level stats on the dashboard page for each group: Completed: 
- Update Added by / edited by in memberPgae tables so that it updates in the databased if the field is modified by anyone new.  

After 7/9/2025

- Modify the api routes for efficiency and reduce redundency 
- Hall furniture inventory option
- Ultimately could allow a floor plan page to be able to record which room is used for what in the log run plan
- Storage Management inventory

