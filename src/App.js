import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { Eye, EyeOff, User, Lock, Mail, ArrowRight, Check } from 'lucide-react';
import './App.css'; // Import the CSS file
import { Amplify } from 'aws-amplify';
import { signIn } from 'aws-amplify/auth';
import { signUp } from 'aws-amplify/auth';
import {confirmSignIn,confirmSignUp} from 'aws-amplify/auth';
import { sha256 } from 'js-sha256';
import ReactModal from 'react-modal';
import { downloadData } from 'aws-amplify/storage';

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


Amplify.configure({
  Auth:{
    Cognito: {
      userPoolId: process.env.REACT_APP_POOLID,
      userPoolClientId: process.env.REACT_APP_POOL_CLIENT_ID,
      identityPoolId: process.env.REACT_APP_IDENTITYPOOLID,
      signUpVerificationMethod: 'code',
      allowGuestAccess: true,
      loginWith: {
        oauth: {
          scopes: [
            'phone',
            'email',
            'profile',
            'openid',
            'clientMetaData',
            'aws.cognito.signin.user.admin'
          ],
          redirectSignIn: ['http://localhost:3000/'],
          redirectSignOut: ['http://localhost:3000/'],
          responseType: 'code' // or 'token', note that REFRESH token will only be generated when the responseType is code
        }
      }
    }
  },
  Storage: {
    S3: {
      bucket: process.env.REACT_APP_S3NAME,
      region: process.env.REACT_APP_REGION,
      [process.env.REACT_APP_S3NAME] : [
        {
          [process.env.REACT_APP_S3NAME]: {
            name: process.env.REACT_APP_S3NAME,
            bucketName: process.env.REACT_APP_S3NAME,
            region: process.env.REACT_APP_REGION,
            paths: {
              "*":{
                guest: ["get", "list"],
                authenticated: ["get", "list"],
                groupsadmin: ["get", "list"]
              }
            }
          }
        }
      ]
    }
  }
});

export default function App() {
  // State management
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };
  // Confirmation step state
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [usernameToConfirm, setUsernameToConfirm] = useState('');
  const [getTos, setGetTos] = useState('No ToS Available');
  const [acceptedToS, setAcceptedToS] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleToSChange = (event) => {
        setAcceptedToS(event.target.checked);
    };

  // Replace the direct setGetTos call with useEffect
  useEffect(() => {
    const fetchToS = async () => {
      try {
        console.log(process.env.REACT_APP_S3NAME)
        const downloadedData = await downloadData({
          path: process.env.REACT_APP_PREFIXKEY
        }).result;
        console.log('Downloaded data:', downloadedData);
        const response = downloadedData.body.text();
        console.log('Response:', response)
        const data = await response;
        setGetTos(data);
      } catch (error) {
        console.error('Error fetching ToS:', error);
        setGetTos('Failed to load Terms of Service');
      }
    };
    
    fetchToS();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  // Handle Sign In
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    const { username, password } = formData;
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { isSignedIn, nextStep} = await signIn({
        username, 
        password,
        options:{
          authFlowType:'CUSTOM_WITH_SRP'
        }
      });
      
      console.log('Initial sign in step:', nextStep);
      
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE'){
        // First custom challenge - reCAPTCHA
        const challengeResponse = recaptchaToken;
        const {isSignedIn: isSignedInAfterCaptcha, nextStep: nextStepAfterCaptcha} = await confirmSignIn({challengeResponse});
        
        console.log('After reCAPTCHA challenge:', { isSignedInAfterCaptcha, nextStepAfterCaptcha });
        
        if (isSignedInAfterCaptcha && nextStepAfterCaptcha.signInStep === 'DONE'){
          // No ToS challenge - direct sign in
          setSuccess('Sign in successful! Redirecting to dashboard...');
          setError('');
          setTimeout(() => {
            navigate('/signout');
          }, 1500);
        } else if (nextStepAfterCaptcha.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
          // Second custom challenge - ToS
          const challengeParameters = nextStepAfterCaptcha.additionalInfo;
          const tosContent = challengeParameters.tos
          
          console.log('ToS challenge parameters:', challengeParameters);
          
          // Navigate to ToS page with the content
          navigate('/terms-of-service', {
            state: {
              tosContent: tosContent,
              challengeParameters: challengeParameters
            }
          });
        } else if(nextStepAfterCaptcha.signInStep !== 'DONE'){
          setError('reCaptcha validation failed');
          setSuccess('');
        }
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
    setRecaptchaToken('');
  };

  // Handle Sign Up
  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }
    console.log(recaptchaToken)

    const { username, email, password, confirmPassword } = formData;
    
    if (!username || !email || !password) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { isSignedUp, nextStep } = await signUp({
        username,
        password,
        options:{
          userAttributes: {
            email,
            "custom:TosValidity": acceptedToS ? sha256.hex(getTos) : ""
          },
          validationData: {token: recaptchaToken}
        }
      });
      
      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setSuccess('Verification code sent to your email. Please enter the code to confirm your account.');
        setIsConfirmStep(true);
        setUsernameToConfirm(username);
      } else {
        setSuccess('Successfully Signed Up please enter code to confirm')
      }

      setError('')
    } catch (err) {
      console.error(err);
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Confirmation Code Submission
  const handleConfirmSignUp = async (e) => {
    if (e) e.preventDefault();
    
    if (!confirmationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: usernameToConfirm,
        confirmationCode
      });
      
      console.log(nextStep);
      
      if (isSignUpComplete) {
        setSuccess('Account verified successfully! You can now sign in.');
        setIsConfirmStep(false);
        setIsLogin(true);
        setConfirmationCode('');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when switching between login and signup
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setIsConfirmStep(false);
    setConfirmationCode('');
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  // Cancel confirmation and go back to signup form
  const cancelConfirmation = () => {
    setIsConfirmStep(false);
    setConfirmationCode('');
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isConfirmStep ? 'Verify your account' : 
             isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
          {!isConfirmStep && (
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={toggleAuthMode}
                className="text-link"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>

        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="auth-message success">
            {success}
          </div>
        )}

        <div className="auth-form">
          {isConfirmStep ? (
            <div className="form-fields">
              <div className="input-group">
                <label htmlFor="confirmationCode" className="sr-only">Confirmation Code</label>
                <div className="input-icon">
                  <Check />
                </div>
                <input
                  id="confirmationCode"
                  name="confirmationCode"
                  type="text"
                  required
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter verification code"
                />
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleConfirmSignUp}
                  className="submit-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>Verify Account</span>
                      <ArrowRight className="button-icon" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={cancelConfirmation}
                  className="text-link"
                  style={{ marginTop: '10px' }}
                >
                  Go back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-fields">
                <div className="input-group">
                  <label htmlFor="username" className="sr-only">Username</label>
                  <div className="input-icon">
                    <User />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Username"
                  />
                </div>

                {!isLogin && (
                  <div className="input-group">
                    <label htmlFor="email" className="sr-only">Email</label>
                    <div className="input-icon">
                      <Mail />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                    />
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="password" className="sr-only">Password</label>
                  <div className="input-icon">
                    <Lock />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                {!isLogin && (
                  <div>
                  <div className="input-group">
                    <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                    <div className="input-icon">
                      <Lock />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm Password"
                    />
                  </div>
                  <div className="tos-container">
                      <div className="tos-content">
                        <div className="tos-acceptance">
                          <input
                            type="checkbox"
                            id="tosAcceptance"
                            checked={acceptedToS}
                            onChange={handleToSChange}
                          />
                          <label htmlFor="tosAcceptance">
                            I accept the{"\u00A0"}
                          </label>
                          <button className="text-link" onClick={openModal}>Terms of Service</button>
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
                            <p>{getTos}</p>
                          </div>

                        </ReactModal>
                      </div>
                      
                    </div>
                  </div>
                )}

                <div className="recaptcha-container">
                  <ReCAPTCHA
                    sitekey={process.env.REACT_APP_SITE_KEY}
                    onChange={token => setRecaptchaToken(token)}
                    theme="light"
                    size="normal"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={isLogin ? handleSignIn : handleSignUp}
                  className="submit-button"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign in' : 'Sign up'}</span>
                      <ArrowRight className="button-icon" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {isLogin && !isConfirmStep && (
          <div className="forgot-password">
            <button 
              type="button"
              className="text-link"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
