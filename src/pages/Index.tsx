import { Navigate } from 'react-router-dom';

// Redirect to dashboard
const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
