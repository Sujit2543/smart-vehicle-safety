// Handled directly in LoginPage — redirect to /login
import { Navigate } from 'react-router-dom';
export default function VerifyOtpPage() { return <Navigate to="/login" replace />; }
