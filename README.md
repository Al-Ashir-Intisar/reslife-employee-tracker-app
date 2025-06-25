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
1. Add Delete Member Button for admin of the group
2. Add Track Hour with location record for each users
    - Needs automatic limit when work starts and not recorded end time
    - Last two weeks work stats bar chart
    - Allow a window select for checking hour stats for a user
    - This view is only for admin and user itself
3. Add profile page for each users and delete option
    - Think if it's better to just enable edit option for user if it's their own memberPage 
4. Add variable based group stats on each group page
5. Add project option in the group page (create, modify, delete functionality)
    - Add event dates in the project details 
    - Hall furniture inventory option
6. Group page will have two tables projects and members
7. Add project detail page similar to member page
8. Add group level stats on the dashboard page for each group
9. Ultimately could allow a floor plan page to be able to record which room is used for what in the log run plan

