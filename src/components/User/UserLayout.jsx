import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserSidebar from './UserSidebar';

const UserLayout = () => {
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const location = useLocation();

  const showSidebar = location.pathname !== '/';

  return (
    <div className="container-fluid">
      <div className="row">
        {showSidebar && (
          <div className="col-md-3">
            <UserSidebar />
          </div>
        )}
        <div className={showSidebar ? 'col-md-9' : 'col-md-12'}>
          <Outlet context={{ selectedQuestion, setSelectedQuestion }} />
        </div>
      </div>
    </div>
  );
};

export default UserLayout;