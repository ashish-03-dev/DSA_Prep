import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';

const UserLayout = () => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const showSidebar = location.pathname !== '/';

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="container-fluid p-5">
      {showSidebar && (
        <button
          className="btn bg-light border d-flex align-items-center gap-2 d-md-none mb-4"
          onClick={toggleSidebar}
        >
          <span>Menu</span>
        </button>
      )}

      <div className="row">
        {/* Sidebar */}
        <div
          className={`col-md-3 bg-light vh-100 p-0 position-fixed top-0 start-0 transition-sidebar ${isSidebarOpen ? 'translate-show' : 'translate-hide'
            } d-md-block`}
          style={{
            zIndex: 1040,
            display: showSidebar ? 'block' : 'none', // Hide instead of unmount
          }}
        >
          <UserSidebar onClose={toggleSidebar} />
        </div>
        {/* Main Content */}
        <div className={`${showSidebar ? 'offset-md-3 col-md-9' : 'col-md-12'}`}>
          <Outlet context={{ selectedQuestion, setSelectedQuestion }} />
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
