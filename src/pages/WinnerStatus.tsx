import WinnerStatusDisplay from "@/components/dashboard/WinnerStatusDisplay";

const WinnerStatus = () => {
  return (
    <div className="container mx-auto py-8 px-6">
      <h1 className="text-3xl font-bold text-white mb-6">Winner Status</h1>
      <WinnerStatusDisplay />
    </div>
  );
};

export default WinnerStatus;
