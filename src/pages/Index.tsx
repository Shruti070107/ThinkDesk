import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const Index = () => {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <WorkspaceLayout />
      </WorkspaceProvider>
    </ThemeProvider>
  );
};

export default Index;
