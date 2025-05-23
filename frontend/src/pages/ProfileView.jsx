import React, { useState, useEffect } from 'react';
import NotificationSettings from '../components/Notifications/NotificationSettings';
import { useAuth } from '../providers/AuthProvider';
import { UserCircle, LogOut, Mail, User, Award, Edit, Settings, Briefcase, Github, Linkedin } from 'lucide-react';
import axios from 'axios';
import { authService } from '../services/authService';
import ProfilePicture from '../components/User/ProfilePicture';
import { userService } from '../services/userService';
import eseduLogo from '../assets/esedu-tiketti.png';

const ProfileView = () => {
  const { user, userRole, logout } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [userData, setUserData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render of ProfilePicture
  
  // Fetch full user data including jobTitle
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await authService.acquireToken();
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/users/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    if (user) {
      fetchUserData();
    }
  }, [user]);
  
  // Load profile picture, but only fetch from Microsoft if needed
  useEffect(() => {
    const loadProfilePicture = async () => {
      if (!user?.username) return;
      
      try {
        // Check if we should refresh from Microsoft Graph API
        // Only refresh once a day (86400000 ms = 24 hours)
        const lastRefresh = localStorage.getItem('lastProfilePictureRefresh');
        const now = Date.now();
        const shouldRefreshFromMicrosoft = !lastRefresh || (now - parseInt(lastRefresh, 10)) > 86400000;
        
        if (shouldRefreshFromMicrosoft) {
          console.log('Refreshing profile picture from Microsoft Graph API');
          // Clear local cache but keep the backend cache
          userService.clearProfileCache();
          
          // Fetch and store from Microsoft Graph API
          await userService.updateProfilePictureFromMicrosoft();
          
          // Update the last refresh timestamp
          localStorage.setItem('lastProfilePictureRefresh', now.toString());
          
          // Force re-render of ProfilePicture component
          setRefreshKey(prevKey => prevKey + 1);
        } else {
          console.log('Using cached profile picture');
          // Just use the cached version - will be loaded when ProfilePicture renders
        }
      } catch (error) {
        console.error('Error with profile picture:', error);
      }
    };
    
    loadProfilePicture();
  }, [user?.username]);
  
  const getRoleText = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'SUPPORT':
        return 'Tukihenkilö';
      case 'USER':
        return 'Opiskelija';
      default:
        return 'Opiskelija';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SUPPORT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRoleChange = async (newRole) => {
    try {
      setIsChangingRole(true);
      const token = await authService.acquireToken();
      await axios.put(
        `${import.meta.env.VITE_API_URL}/users/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      // Päivitä sivu roolin vaihtamisen jälkeen
      window.location.reload();
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Roolin vaihto epäonnistui');
    } finally {
      setIsChangingRole(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profiilitiedot */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Header with background */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-8 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative">
                <ProfilePicture 
                  key={refreshKey} // Force re-render when refreshKey changes
                  email={user?.username} 
                  name={user?.name} 
                  size="xl" 
                  className="border-4 border-white shadow-lg"
                />

              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user?.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-white/80">
                  <Mail size={16} />
                  <span>{user?.email}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    getRoleBadgeClass(userRole)
                  }`}>
                    {getRoleText(userRole)}
                  </span>
                  
                  {/* Job Title Badge */}
                  {userData?.jobTitle && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium border bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
                      <Briefcase size={14} />
                      {userData.jobTitle}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Profile content */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Profile information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <User size={18} />
                  Käyttäjätiedot
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nimi</label>
                    <p className="mt-1 text-lg text-gray-900">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Sähköposti</label>
                    <p className="mt-1 text-lg text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Rooli</label>
                    <p className="mt-1 text-lg text-gray-900">{getRoleText(userRole)}</p>
                  </div>
                  
                  {/* Job Title in details section */}
                  {userData?.jobTitle && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Ryhmä</label>
                      <p className="mt-1 text-lg text-gray-900">{userData.jobTitle}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Development environment role switcher */}
              {import.meta.env.VITE_ENVIRONMENT === 'development' && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-md font-medium flex items-center gap-2 mb-3 text-gray-700">
                    <Settings size={16} />
                    Vaihda rooli (Kehitystyökalu)
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={userRole || ''}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      disabled={isChangingRole}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <option value="USER">Opiskelija</option>
                      <option value="SUPPORT">Tukihenkilö</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {isChangingRole && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Logout button */}
              <div className="mt-6">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full md:w-auto rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-3 text-sm font-medium transition-colors"
                >
                  <LogOut size={18} />
                  <span>Kirjaudu ulos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notification settings card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Ilmoitusasetukset</h2>
          </div>
          <div className="p-6">
            <NotificationSettings />
          </div>
        </div>

        {/* Watermark */}
        <div className="flex flex-col items-center text-center mt-12 mb-6 ">
          <img 
            src={eseduLogo} 
            alt="Esedu Tiketti Logo" 
            className="w-80 h-auto mb-3"
          />
          <p className="text-xs text-gray-500 max-w-md">
            Tämä projekti on toteutettu opiskelijan lopputyönä Esedu-oppilaitokselle.
            <span className="font-medium mt-2 block">
              Tobias Lång — Technical Lead & AI Solutions • <a 
                href="https://intelliqai.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                intelliqai.com
              </a>
            </span>
            <div className="flex items-center justify-center gap-3 mt-1">
              <a 
                href="https://github.com/Tobsukka" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a 
                href="https://linkedin.com/in/tobias-lång" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileView; 