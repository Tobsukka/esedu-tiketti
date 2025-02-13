import React from 'react';
import { useState } from 'react';
import { User, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/TextArea';
import { useAuth } from '../../providers/AuthProvider';

export default function CommentSection({
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  addCommentMutation,
  ticket
}) {
  const { user, userRole } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const canComment = () => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return false;
    }

    if (ticket.createdById === user?.id) {
      return true;
    }

    if (userRole === 'SUPPORT' || userRole === 'ADMIN') {
      return (
        userRole === 'ADMIN' ||
        (ticket.status === 'IN_PROGRESS' && ticket.assignedToId === user?.id)
      );
    }

    return true;
  };

  const getCommentDisabledMessage = () => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return 'Tiketti on ratkaistu tai suljettu - kommentointi ei ole mahdollista';
    }
    if ((userRole === 'SUPPORT' || userRole === 'ADMIN') && 
        ticket.status === 'OPEN' && 
        userRole !== 'ADMIN') {
      return 'Ota tiketti ensin käsittelyyn kommentoidaksesi';
    }
    if (userRole === 'SUPPORT' && 
        ticket.status === 'IN_PROGRESS' && 
        ticket.assignedToId !== user?.id) {
      return 'Vain tiketin käsittelijä voi kommentoida';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await handleAddComment();

    if (!addCommentMutation.isError) {
      setSuccessMessage('Kommentti lisätty! 🎉');
      setTimeout(() => setSuccessMessage(''), 1500);
      setShowForm(false);
      setNewComment('');
    }
  };

  return (
    <div>
      {comments.length > 0 ? (
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="p-3 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-700">{comment.content}</p>
              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                <User className="w-3 h-3" />
                <span>
                  {comment.author?.name ||
                    comment.author?.email ||
                    'Tuntematon'}
                </span>
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(comment.createdAt).toLocaleDateString('fi-FI', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2">Ei kommentteja</p>
      )}

      {successMessage && (
        <div className="mt-2 p-2 text-green-700 bg-green-100 border border-green-400 rounded">
          {successMessage}
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        {!showForm ? (
          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)}
            disabled={!canComment()}
            title={!canComment() ? getCommentDisabledMessage() : undefined}
          >
            + Lisää kommentti
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Peruuta
            </Button>
            <Button
              type="submit"
              disabled={!canComment() || addCommentMutation.isLoading || !newComment.trim()}
              onClick={handleSubmit}
            >
              {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää kommentti'}
            </Button>
          </>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Label htmlFor="new-comment">Lisää kommentti</Label>
          <Textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Kirjoita kommentti..."
            disabled={!canComment()}
          />
        </form>
      )}

      {!canComment() && (
        <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
          {getCommentDisabledMessage()}
        </div>
      )}
    </div>
  );
}
