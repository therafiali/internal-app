<button
  onClick={() => handleProcessPayment(request)}
  disabled={loadingAction?.id === request.redeemId && loadingAction?.type === "process"}
  className="px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
  {loadingAction?.id === request.redeemId && loadingAction?.type === "process" ? (
    <>
      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      Processing...
    </>
  ) : (
    "Process"
  )}
</button> 