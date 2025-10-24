import { Header } from '../components/ui/header-2';
import { Hero } from '../components/Hero';
import { Features } from '../components/ui/Features';
import { Extra } from '../components/Extra';
import { ContactUs } from '../components/ContactUs';
import SignIn from '../components/SignIn';
import SignUp from '../components/SignUp';
import { useAuthModalStore } from '../store';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const { isLoginOpen, isSignupOpen } = useAuthModalStore();
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Header />
      <Hero />
      <Features />
      <Extra />
      <ContactUs />
      {!isAuthenticated && isLoginOpen && <SignIn />}
      {!isAuthenticated && isSignupOpen && <SignUp />}
    </>
  );
}
