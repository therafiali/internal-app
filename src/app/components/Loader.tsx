import React from "react";

const Loader = ({ text }: { text: string } = { text: "Make a Tea..." }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-gray-400">Loading {text} </p>
      </div>
    </div>
  );
};

export default Loader;
