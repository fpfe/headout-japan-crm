'use client'

import { useState } from 'react'
import type { Lead, LeadStatus } from '@/types'
import PipelineBoard from '@/components/pipeline/PipelineBoard'

export default function PipelinePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState<LeadStatus | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])

  const totalValue = leads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0)
  const formattedValue =
    '¥' + totalValue.toLocaleString('en-US') + ' Pipeline Value'

  function openModal(status: LeadStatus | null) {
    setModalStatus(status)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div
            className="text-[11px] uppercase font-bold tracking-[0.18em]"
            style={{ color: '#a83900' }}
          >
            Sales Pipeline
          </div>
          <h1
            className="font-display font-extrabold text-[#181c23] mt-2"
            style={{
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '2.5rem',
              lineHeight: 1.1,
            }}
          >
            Sales Momentum
          </h1>
          <div className="mt-2 text-[14px] text-gray-500">
            Q2 Japan Expansion •{' '}
            <span style={{ color: '#a83900' }} className="font-semibold">
              {formattedValue}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-white text-[13px] font-semibold text-[#181c23] px-5 py-2.5 rounded-full"
            style={{ border: '1px solid #e5e8f3' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Filter
          </button>
          <button
            type="button"
            onClick={() => openModal(null)}
            className="brand-gradient text-white text-[13px] font-semibold px-5 py-2.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)',
            }}
          >
            + New Merchant
          </button>
        </div>
      </div>

      <PipelineBoard
        modalOpen={modalOpen}
        modalInitialStatus={modalStatus}
        onModalClose={() => setModalOpen(false)}
        onOpenAddModal={openModal}
        onLeadsChange={setLeads}
      />
    </div>
  )
}
