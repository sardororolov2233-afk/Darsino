import React from "react";
import { AppText, Button, Screen } from "./ui";
import { Brand } from "./Brand";
import { C } from "../theme";
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean; retry: number }
> {
  state = { failed: false, retry: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    console.warn("[Oqi] render_failure");
  }
  render() {
    return this.state.failed ? (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <Brand width={160} />
        <AppText variant="heading">Ilovani ochib bo‘lmadi</AppText>
        <AppText color={C.muted} style={{ textAlign: "center" }}>
          Saqlangan ma’lumotlaringiz bilan qayta ulanishga urinib ko‘ring.
        </AppText>
        <Button
          title="Qayta ochish"
          icon="refresh-cw"
          onPress={() =>
            this.setState((s) => ({ failed: false, retry: s.retry + 1 }))
          }
        />
      </Screen>
    ) : (
      <React.Fragment key={this.state.retry}>
        {this.props.children}
      </React.Fragment>
    );
  }
}
