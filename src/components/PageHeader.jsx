import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/PageHeader.css';

const PageHeader = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const username = localStorage.getItem('username') || '';
  const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');

  const hasPermission = (permission) => userPermissions.includes(permission);
  const isAdmin = userRoles.includes('Admin');

  const links = useMemo(() => {
    const items = [{ to: '/home', label: '🏠 Home' }];

    if (hasPermission('ENTRY_MODULE')) items.push({ to: '/entry-module', label: '📝 Entry Module' });
    if (hasPermission('VIEW_DATA')) items.push({ to: '/view-module', label: '👁️ View Data' });
    if (hasPermission('QUIZ_ATTEMPT')) items.push({ to: '/quiz-attempt', label: '📖 Attempt Quiz' });
    if (isAdmin || hasPermission('QUIZ_CREATE')) items.push({ to: '/quiz-assignments', label: '📋 Assign Quizzes' });
    if (isAdmin || hasPermission('QUIZ_CREATE')) items.push({ to: '/quiz-assignments', label: '📊 Quiz Overview', state: { initialTab: 'overview' } });

    return items;
  }, [userPermissions, userRoles]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-left">
          <button className="page-header-btn" onClick={() => setShowMenu((prev) => !prev)}>
            ☰ Menu
          </button>
        </div>
        <div className="page-header-center">Welcome{username ? `, ${username}` : ''}</div>
        <div className="page-header-right">
          <button className="page-header-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </header>

      {showMenu && (
        <div className="page-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="page-menu-content" onClick={(e) => e.stopPropagation()}>
            {links.map((item) => (
              <Link key={`${item.to}-${item.label}`} to={item.to} state={item.state} className="page-menu-link" onClick={() => setShowMenu(false)}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default PageHeader;
