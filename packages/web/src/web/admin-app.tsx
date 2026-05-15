import { Route, Switch } from "wouter";
import AdminPanel from "./pages/admin/index";
import AdminLogin from "./pages/admin/login";

function AdminApp() {
  return (
    <Switch>
      <Route path="/login" component={AdminLogin} />
      <Route path="/" component={AdminPanel} />
    </Switch>
  );
}

export default AdminApp;
