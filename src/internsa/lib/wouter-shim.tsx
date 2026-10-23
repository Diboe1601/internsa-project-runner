// Minimal wouter-compatible API implemented on top of TanStack Router,
// so the imported InternSA app runs without the wouter package.
import {
  Link as TanStackLink,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  Children,
  isValidElement,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

function usePathname() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function useLocation(): [string, (to: string) => void] {
  const pathname = usePathname();
  const navigate = useNavigate();
  return [pathname, (to: string) => navigate({ to })];
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
};

export function Link({ href, children, ...rest }: LinkProps) {
  return (
    <TanStackLink to={href} activeProps={{}} {...(rest as Record<string, unknown>)}>
      {children}
    </TanStackLink>
  );
}

export function Router({ children }: { children?: ReactNode; base?: string }) {
  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any;

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i]!;
    const segment = pathParts[i]!;
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(segment);
    } else if (p !== segment) {
      return null;
    }
  }
  return params;
}

type RouteProps = {
  path?: string;
  children?: ReactNode | ((params: Params) => ReactNode);
};

export function Route(_props: RouteProps) {
  // Rendered by <Switch>; never rendered directly.
  return null;
}

export function Switch({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const childArray = Children.toArray(children);
  for (const child of childArray) {
    if (!isValidElement(child)) continue;
    const element = child as ReactElement<RouteProps>;
    const { path, children: routeChildren } = element.props;
    if (path === undefined) {
      // Default (catch-all) route.
      return <>{renderRouteChildren(routeChildren, {})}</>;
    }
    const params = matchPath(path, pathname);
    if (params) {
      return <>{renderRouteChildren(routeChildren, params)}</>;
    }
  }
  return null;
}

function renderRouteChildren(
  routeChildren: RouteProps["children"],
  params: Params,
): ReactNode {
  return typeof routeChildren === "function"
    ? routeChildren(params)
    : routeChildren;
}
