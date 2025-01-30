import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { fetchTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';
import { Alert } from '../components/ui/Alert';
import UserManagementDialog from '../components/Admin/UserManagementDialog';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const { user, userRole } = useAuth();

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const response = await fetchTickets();
        setTickets(response.tickets);
        setError(null);
      } catch (err) {
        console.error('Error loading tickets:', err);
        setError('Tikettien lataaminen epäonnistui');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadTickets();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Ladataan tikettejä...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="error" title="Virhe" message={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kaikki tiketit</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hallinnoi ja seuraa kaikkia tikettejä
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsUserManagementOpen(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            Hallitse käyttäjiä
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-500">Ei tikettejä</p>
        </div>
      ) : (
        <TicketList tickets={tickets} />
      )}

      <UserManagementDialog
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />
    </div>
  );
}
