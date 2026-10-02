import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/admin/ui/index.js";
import { ROUTES } from "../../routes/paths.js";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="content">
      <PageHeader title="Page not found" desc="The page you're looking for doesn't exist.">
        <button className="primary" onClick={() => navigate(ROUTES.dashboard)}>
          Back to Dashboard
        </button>
      </PageHeader>
    </section>
  );
}
