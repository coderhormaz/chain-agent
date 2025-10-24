import { useNavigate } from 'react-router-dom';
import ResetPasswordPage from '../components/ResetPasswordPage';

export default function ResetPasswordPageWrapper() {
  const navigate = useNavigate();

  return <ResetPasswordPage onBack={() => navigate('/')} />;
}
