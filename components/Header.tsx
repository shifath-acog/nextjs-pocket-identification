import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-md z-50">
      <div className="flex items-center justify-between px-4 py-2 w-full ml-10">
        <div className="flex items-center">
          <Image 
            src="https://www.aganitha.ai/wp-content/uploads/2023/05/aganitha-logo.png"
            alt="Aganitha Logo"
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
        </div>
        
        {/* Centered Content */}
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">PocketPredict</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Protein Pocket Visualization with GrASP and P2Rank</p>
        </div>
        
        {/* Empty div to maintain balance */}
        <div className="w-[120px]"></div>
      </div>
    </header>
  );
}