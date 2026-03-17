/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/AdminStudents';
import BrowseCourses from './pages/BrowseCourses';
import Certificates from './pages/Certificates';
import CourseDetail from './pages/CourseDetail';
import Home from './pages/Home';
import ManageCourse from './pages/ManageCourse';
import MyCourses from './pages/MyCourses';
import Player from './pages/Player';
import Settings from './pages/Settings';
import StoreProgress from './pages/StoreProgress';
import StudentProgress from './pages/StudentProgress';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminStudents": AdminStudents,
    "BrowseCourses": BrowseCourses,
    "Certificates": Certificates,
    "CourseDetail": CourseDetail,
    "Home": Home,
    "ManageCourse": ManageCourse,
    "MyCourses": MyCourses,
    "Player": Player,
    "Settings": Settings,
    "StoreProgress": StoreProgress,
    "StudentProgress": StudentProgress,
}

export const pagesConfig = {
    mainPage: "AdminDashboard",
    Pages: PAGES,
    Layout: __Layout,
};