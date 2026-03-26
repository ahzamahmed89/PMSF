import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/PageHeader.css';

const PageHeader = ({ onLogout, compactMenu = false }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const menuContentRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({
    branchMystery: false,
    productKnowledge: false,
    employeeManagement: false,
    checklistManagement: false
  });

  const username = localStorage.getItem('username') || '';
  const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
  const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');

  const hasPermission = (permission) => userPermissions.includes(permission);
  const isAdmin = userRoles.includes('Admin');

  const toggleSection = (section) => {
    setExpandedSections((prev) => {
      const nextState = {};
      const nextValue = !prev[section];

      Object.keys(prev).forEach((key) => {
        nextState[key] = key === section ? nextValue : false;
      });

      return nextState;
    });
  };

  const closeMenu = () => {
    setShowMenu(false);
  };

  useEffect(() => {
    if (!showMenu || !compactMenu) return;

    const handleOutsideClick = (event) => {
      if (menuContentRef.current?.contains(event.target)) return;
      if (menuButtonRef.current?.contains(event.target)) return;
      setShowMenu(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu, compactMenu]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userFullName');
    localStorage.removeItem('userRoles');
    localStorage.removeItem('userPermissions');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-left">
          <button ref={menuButtonRef} type="button" className="page-header-btn" onClick={() => setShowMenu((prev) => !prev)}>
            ☰ Menu
          </button>
        </div>
        <div className="page-header-center">Welcome{username ? `, ${username}` : ''}</div>
        <div className="page-header-right">
          <button type="button" className="page-header-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </header>

      {showMenu && !compactMenu && (
        <div className="page-menu-overlay" onClick={closeMenu}>
          <div className="page-menu-content" onClick={(e) => e.stopPropagation()}>
            <nav className="page-menu-nav">
              <div className="page-menu-section page-menu-section-home">
                <Link to="/home" className="page-menu-link page-menu-link-home" onClick={closeMenu}>
                  🏠 Home
                </Link>
              </div>

              <div className="page-menu-section">
                <button
                  type="button"
                  className={`page-section-title ${expandedSections.branchMystery ? 'expanded' : ''}`}
                  onClick={() => toggleSection('branchMystery')}
                >
                  <span>Branch Mystery Shopping</span>
                  <span className={`page-dropdown-icon ${expandedSections.branchMystery ? 'expanded' : ''}`}>▼</span>
                </button>
                {expandedSections.branchMystery && (
                  <div className="page-section-items">
                    {hasPermission('ENTRY_MODULE') && (
                      <Link to="/entry-module" className="page-menu-link" onClick={closeMenu}>
                        📝 Entry Module
                      </Link>
                    )}
                    {hasPermission('VIEW_DATA') && (
                      <Link to="/view-module" className="page-menu-link" onClick={closeMenu}>
                        👁️ View Data
                      </Link>
                    )}
                    {hasPermission('DATA_MANAGER') && (
                      <Link to="/data-manager" className="page-menu-link" onClick={closeMenu}>
                        📋 Data Manager
                      </Link>
                    )}
                    {(isAdmin || hasPermission('ENTRY_MODULE')) && (
                      <Link to="/checklist-entry" className="page-menu-link" onClick={closeMenu}>
                        🧾 Checklist Input
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {(isAdmin || hasPermission('DATA_MANAGER')) && (
                <div className="page-menu-section">
                  <button
                    type="button"
                    className={`page-section-title ${expandedSections.checklistManagement ? 'expanded' : ''}`}
                    onClick={() => toggleSection('checklistManagement')}
                  >
                    <span>Custom Checklist Management</span>
                    <span className={`page-dropdown-icon ${expandedSections.checklistManagement ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {expandedSections.checklistManagement && (
                    <div className="page-section-items">
                      <Link to="/checklist-manager" className="page-menu-link" onClick={closeMenu}>
                        ✅ Custom Checklist Manager
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="page-menu-section">
                <button
                  type="button"
                  className={`page-section-title ${expandedSections.productKnowledge ? 'expanded' : ''}`}
                  onClick={() => toggleSection('productKnowledge')}
                >
                  <span>Product Knowledge</span>
                  <span className={`page-dropdown-icon ${expandedSections.productKnowledge ? 'expanded' : ''}`}>▼</span>
                </button>
                {expandedSections.productKnowledge && (
                  <div className="page-section-items">
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-creator" className="page-menu-link" onClick={closeMenu}>
                        ✏️ Create Quiz
                      </Link>
                    )}
                    {hasPermission('QUIZ_ATTEMPT') && (
                      <Link to="/quiz-attempt" className="page-menu-link" onClick={closeMenu}>
                        📖 Attempt Quiz
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-assignments" className="page-menu-link" onClick={closeMenu}>
                        📋 Assign Quizzes
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-assignments" state={{ initialTab: 'overview' }} className="page-menu-link" onClick={closeMenu}>
                        📊 Quiz Overview
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                <div className="page-menu-section">
                  <button
                    type="button"
                    className={`page-section-title ${expandedSections.employeeManagement ? 'expanded' : ''}`}
                    onClick={() => toggleSection('employeeManagement')}
                  >
                    <span>Employee Management</span>
                    <span className={`page-dropdown-icon ${expandedSections.employeeManagement ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {expandedSections.employeeManagement && (
                    <div className="page-section-items">
                      <Link to="/employees" className="page-menu-link" onClick={closeMenu}>
                        👥 Manage Employees
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {(isAdmin || hasPermission('USER_MANAGEMENT')) && (
                <div className="page-menu-section">
                  <Link to="/admin" className="page-menu-link page-admin-link" onClick={closeMenu}>
                    ⚙️ Admin Panel
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}

      {showMenu && compactMenu && (
        <div className="page-menu-popover" ref={menuContentRef}>
          <div className="page-menu-content">
            <nav className="page-menu-nav">
              <div className="page-menu-section page-menu-section-home">
                <Link to="/home" className="page-menu-link page-menu-link-home" onClick={closeMenu}>
                  🏠 Home
                </Link>
              </div>

              <div className="page-menu-section">
                <button
                  type="button"
                  className={`page-section-title ${expandedSections.branchMystery ? 'expanded' : ''}`}
                  onClick={() => toggleSection('branchMystery')}
                >
                  <span>Branch Mystery Shopping</span>
                  <span className={`page-dropdown-icon ${expandedSections.branchMystery ? 'expanded' : ''}`}>▼</span>
                </button>
                {expandedSections.branchMystery && (
                  <div className="page-section-items">
                    {hasPermission('ENTRY_MODULE') && (
                      <Link to="/entry-module" className="page-menu-link" onClick={closeMenu}>
                        📝 Entry Module
                      </Link>
                    )}
                    {hasPermission('VIEW_DATA') && (
                      <Link to="/view-module" className="page-menu-link" onClick={closeMenu}>
                        👁️ View Data
                      </Link>
                    )}
                    {hasPermission('DATA_MANAGER') && (
                      <Link to="/data-manager" className="page-menu-link" onClick={closeMenu}>
                        📋 Data Manager
                      </Link>
                    )}
                    {(isAdmin || hasPermission('ENTRY_MODULE')) && (
                      <Link to="/checklist-entry" className="page-menu-link" onClick={closeMenu}>
                        🧾 Checklist Input
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {(isAdmin || hasPermission('DATA_MANAGER')) && (
                <div className="page-menu-section">
                  <button
                    type="button"
                    className={`page-section-title ${expandedSections.checklistManagement ? 'expanded' : ''}`}
                    onClick={() => toggleSection('checklistManagement')}
                  >
                    <span>Custom Checklist Management</span>
                    <span className={`page-dropdown-icon ${expandedSections.checklistManagement ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {expandedSections.checklistManagement && (
                    <div className="page-section-items">
                      <Link to="/checklist-manager" className="page-menu-link" onClick={closeMenu}>
                        ✅ Custom Checklist Manager
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="page-menu-section">
                <button
                  type="button"
                  className={`page-section-title ${expandedSections.productKnowledge ? 'expanded' : ''}`}
                  onClick={() => toggleSection('productKnowledge')}
                >
                  <span>Product Knowledge</span>
                  <span className={`page-dropdown-icon ${expandedSections.productKnowledge ? 'expanded' : ''}`}>▼</span>
                </button>
                {expandedSections.productKnowledge && (
                  <div className="page-section-items">
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-creator" className="page-menu-link" onClick={closeMenu}>
                        ✏️ Create Quiz
                      </Link>
                    )}
                    {hasPermission('QUIZ_ATTEMPT') && (
                      <Link to="/quiz-attempt" className="page-menu-link" onClick={closeMenu}>
                        📖 Attempt Quiz
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-assignments" className="page-menu-link" onClick={closeMenu}>
                        📋 Assign Quizzes
                      </Link>
                    )}
                    {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                      <Link to="/quiz-assignments" state={{ initialTab: 'overview' }} className="page-menu-link" onClick={closeMenu}>
                        📊 Quiz Overview
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {(isAdmin || hasPermission('QUIZ_CREATE')) && (
                <div className="page-menu-section">
                  <button
                    type="button"
                    className={`page-section-title ${expandedSections.employeeManagement ? 'expanded' : ''}`}
                    onClick={() => toggleSection('employeeManagement')}
                  >
                    <span>Employee Management</span>
                    <span className={`page-dropdown-icon ${expandedSections.employeeManagement ? 'expanded' : ''}`}>▼</span>
                  </button>
                  {expandedSections.employeeManagement && (
                    <div className="page-section-items">
                      <Link to="/employees" className="page-menu-link" onClick={closeMenu}>
                        👥 Manage Employees
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {(isAdmin || hasPermission('USER_MANAGEMENT')) && (
                <div className="page-menu-section">
                  <Link to="/admin" className="page-menu-link page-admin-link" onClick={closeMenu}>
                    ⚙️ Admin Panel
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default PageHeader;
