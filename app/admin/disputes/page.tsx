"use client";

import { useState, useEffect } from "react";
import { 
  getIntentDisputes, 
  provideDisputeEvidence, 
  closeDispute, 
  submitDisputeToBank 
} from "@/app/lib/dispute";

export default function DisputeSection({ stripeId }: { stripeId: string }) {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    try {
      const data = await getIntentDisputes(stripeId);
      setDisputes(data);
    } catch (err) {
      console.error("Error u hvatanju disputea: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDisputes(); }, [stripeId]);

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
  if (disputes.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
        ⚠️ Dispute Management
      </h3>
      
      <div className="space-y-6">
        {disputes.map((dispute, index) => {
          //editableStatuses su jedini koji se smiju uredivati
          const editableStatuses = ['needs_response', 'warning_needs_response'];
          const isEditable = editableStatuses.includes(dispute.status.toLowerCase().trim());

          return (
            <div 
              key={dispute.disputeId }//|| dispute.id || `dispute-${index}`} 
              className={`border rounded-lg p-5 ${!isEditable ? 'bg-gray-100 border-gray-300' : 'bg-red-50 border-red-200'}`}
            >
              {/* Header Info */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div>
                    <strong className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">Dispute ID: {dispute.disputeId}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">Status:</span>
                    <p className={`font-bold uppercase text-sm ${isEditable ? 'text-red-600' : 'text-gray-500'}`}>
                      {dispute.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider">Amount:</span>
                  <p className="text-lg font-bold text-gray-900">{(dispute.currency)} {(dispute.amount / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{dispute.reason?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Ako je editable, prikaži prozor za dodavanje argumenta */}
              {isEditable ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 italic">Evidence Text:</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded p-2 text-sm h-24 shadow-sm focus:ring-1 focus:ring-blue-400 outline-none"
                      placeholder="Ovdje se upisuje dodatan info za dispute"
                      value={evidenceMap[dispute.id] || dispute.evidence || ""}
                      onChange={(e) => setEvidenceMap({ ...evidenceMap, [dispute.id]: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={async () => {
                        await provideDisputeEvidence(dispute.disputeId, evidenceMap[dispute.id]);
                        console.log("Evidence saved to database.");
                      }}
                      className="bg-white border border-gray-300 px-4 py-2 rounded text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      Provide evidence
                    </button>
                    
                    <button 
                      onClick={async () => {
                        if(confirm("Submit to bank? This action cannot be undone.")) {
                          await submitDisputeToBank(dispute.disputeId);
                          fetchDisputes();
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 shadow-sm"
                    >
                      Submit dispute to Bank
                    </button>

                    <button 
                      onClick={async () => {
                        if(confirm("Accept the loss? This will close the dispute immediately.")) {
                          await closeDispute(dispute.disputeId);
                          fetchDisputes();
                        }
                      }}
                      className="bg-transparent border border-red-300 text-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-50"
                    >
                      Close Dispute (lose it)
                    </button>
                  </div>
                </>
              ) : (
                /* READ ONLY VIEW FOR FINALIZED DISPUTES */
                <div className="mt-2 text-sm text-gray-600 border-t border-gray-300 pt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className="h-2 w-2 rounded-full inline-block"
                      style={{ backgroundColor: dispute.status === 'won' ? '#22c55e' : dispute.status === 'lost' ? '#ef4444' : '#9ca3af' }}
                    />
                    <span style={{ color: dispute.status === 'won' ? '#22c55e' : dispute.status === 'lost' ? '#ef4444' : '#9ca3af' }}>
                      {dispute.status === 'under_review'
                        ? "Evidence submitted. Awaiting bank decision."
                        : `Finalized: ${dispute.status}.`}
                    </span>
                  </div>
                  {dispute.evidence && (
                    <div className="mt-2 text-sm text-gray-600 border-t border-gray-300 pt-3 flex flex-col gap-2">
                      <span>Submitted Evidence:</span> "{dispute.evidence}"
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}