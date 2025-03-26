import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestDetails: any;
  type: 'recharge' | 'redeem';
}

const RequestDetailsModal = ({ isOpen, onClose, requestDetails, type }: RequestDetailsModalProps) => {
  if (!requestDetails) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#1a1a1a] p-6 shadow-xl transition-all border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-white">
                    Request Details
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {type === 'recharge' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Request ID</p>
                        <p className="text-white font-medium">{requestDetails.rechargeId}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Status</p>
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          requestDetails.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          requestDetails.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {requestDetails.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Player Name</p>
                        <p className="text-white">{requestDetails.playerName}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Game Platform</p>
                        <p className="text-white">{requestDetails.gamePlatform}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Game Username</p>
                        <p className="text-white">{requestDetails.gameUsername}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Amount</p>
                        <p className="text-white">${requestDetails.amount?.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Payment Method</p>
                        <div className="bg-gray-800/30 p-3 rounded-lg">
                          <p className="text-sm font-medium text-white">{requestDetails.paymentMethod?.type}</p>
                          <p className="text-sm text-gray-400">{requestDetails.paymentMethod?.username}</p>
                        </div>
                      </div>
                      {requestDetails.screenshotUrl && (
                        <div className="col-span-2 space-y-2">
                          <p className="text-sm text-gray-400">Screenshot</p>
                          <img 
                            src={requestDetails.screenshotUrl} 
                            alt="Payment Screenshot" 
                            className="max-w-full h-auto rounded-lg border border-gray-800"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Request ID</p>
                        <p className="text-white font-medium">{requestDetails.redeemId}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Status</p>
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          requestDetails.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          requestDetails.status === 'processed' ? 'bg-green-500/10 text-green-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {requestDetails.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Username</p>
                        <p className="text-white">{requestDetails.username}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Game Platform</p>
                        <p className="text-white">{requestDetails.gamePlatform}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-white">${requestDetails.totalAmount?.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Amount Paid</p>
                        <p className="text-white">${requestDetails.amountPaid?.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Amount Hold</p>
                        <p className="text-white">${requestDetails.amountHold?.toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">Amount Available</p>
                        <p className="text-white">${requestDetails.amountAvailable?.toFixed(2)}</p>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <p className="text-sm text-gray-400">Payment Methods</p>
                        <div className="grid grid-cols-2 gap-2">
                          {requestDetails.paymentMethods?.map((pm: any) => (
                            <div key={pm._id} className="bg-gray-800/30 p-3 rounded-lg">
                              <p className="text-sm font-medium text-white">{pm.type}</p>
                              <p className="text-sm text-gray-400">{pm.username}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default RequestDetailsModal;