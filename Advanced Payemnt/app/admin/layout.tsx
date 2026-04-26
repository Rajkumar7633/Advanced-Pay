import { AiCopilot } from '@/components/ai-copilot';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AiCopilot isAdmin={true} />
    </>
  );
}
