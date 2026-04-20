import OnboardingWizard from "../components/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <OnboardingWizard
      userId="auth-user-uid" // TODO: Replace with actual user ID from auth
      onComplete={(merchantId) => {
        // Redirect to dashboard or success page
        window.location.href = `/dashboard?merchant=${merchantId}`;
      }}
    />
  );
}
