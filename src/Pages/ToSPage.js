import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { confirmSignIn } from 'aws-amplify/auth';
import { ArrowRight, FileText, Check } from 'lucide-react';
import ReactModal from 'react-modal';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '700px',
    maxHeight: '80vh',
    padding: '20px',
    borderRadius: '8px'
  }
};

export default function TermsOfService() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };
  
  // Get ToS content from navigation state
  const tosContent = location.state?.tosContent || 'Terms of Service content not available';
  const challengeParameters = location.state?.challengeParameters;

  const handleAcknowledge = async () => {
    if (!acknowledged) {
      setError('Please acknowledge that you have read and agree to the Terms of Service');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { isSignedIn, nextStep } = await confirmSignIn({
        challengeResponse: tosContent
      });

      console.log('ToS confirmation result:', { isSignedIn, nextStep });

      if (isSignedIn && nextStep.signInStep === 'DONE') {
        // Successfully completed all authentication steps
        navigate('/signout', { 
          state: { 
            message: 'Successfully signed in and Terms of Service acknowledged!' 
          } 
        });
      } else if (nextStep.signInStep !== 'DONE') {
        // Handle any additional steps if needed
        setError('Authentication process incomplete. Please try again.');
      }
    } catch (err) {
      console.error('ToS acknowledgment error:', err);
      setError(err.message || 'Failed to acknowledge Terms of Service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '40rem' }}>
        <div className="auth-header">
          <h2>Terms of Service has been Updated</h2>
          <p>Please read and acknowledge the new Terms of Service to complete your registration</p>
        </div>

        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        <div className="auth-form">
          {/* ToS Content Display */}
          <div className="tos-content">
            <div className="tos-header">
              <FileText className="tos-icon" />
              <h3>Terms of Service Agreement</h3>
            </div>
            
            <ReactModal
              isOpen={modalIsOpen}
              onRequestClose={closeModal}
              style={customStyles}
              contentLabel="Terms of Service Modal"
              shouldCloseOnOverlayClick={true}
              shouldCloseOnEsc={true}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>Terms of Service</h2>
                <button 
                  onClick={closeModal}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '24px', 
                    cursor: 'pointer' 
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>
                {tosContent.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
                ))}
              </div>
              </ReactModal>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="tos-acceptance">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span className="checkmark"></span>
              {"\u00A0"}I have read and agree to the {"\u00A0"}
            </label>
            <button className="text-link" onClick={openModal}>Terms of Service</button>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleAcknowledge}
              className="submit-button"
              disabled={isLoading || !acknowledged}
            >
              {isLoading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>Acknowledge & Continue</span>
                  <ArrowRight className="button-icon" />
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleGoBack}
              className="text-link"
              style={{ marginTop: '1rem', width: '100%', textAlign: 'center' }}
            >
              Go back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
