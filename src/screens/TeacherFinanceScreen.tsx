import React, { useState } from "react";
import { Platform, Share, View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { WorkspaceHeader } from "../components/ClassroomUI";
import { MonthPicker } from "../components/GroupPayments";
import {
  FilterSelect,
  FilterOptions,
  filterChoices,
} from "../components/FilterControls";
import { UserAvatar } from "../components/UserAvatar";
import { Feedback, useAction } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { teacherFinance, financeHistory, csvCell } from "../state/finance";
import { canRemind, monthLabel, paymentMonth } from "../state/payments";
import { formatPrice } from "../data/catalog";
import { matchesSearch } from "../state/learning";
import { dateLabel } from "../state/domain";
import { C } from "../theme";

export function TeacherFinanceScreen() {
  const { user, market, command, refresh, syncError } = useApp(),
    action = useAction(),
    navigation = useAppNavigation();
  const [month, setMonth] = useState(paymentMonth),
    [group, setGroup] = useState("all"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("Barchasi"),
    [undo, setUndo] = useState("");
  const finance = teacherFinance(market, user.id, month, group);
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const rows = finance.rows.filter(
    (r) =>
      matchesSearch(`${r.name} ${r.group.title}`, query) &&
      (status === "Barchasi" || (status === "To‘langan" ? r.paid : !r.paid)),
  );
  const history = financeHistory(market, user.id, month, group),
    maximum = Math.max(1, ...history.map((h) => h.received));
  const exportReport = async () => {
    const csv =
      "\uFEFF" +
      [
        ["Oy", "O‘quvchi", "Guruh", "Summa", "Holat", "To‘lov sanasi"],
        ...rows.map((r) => [
          month,
          r.name,
          r.group.title,
          r.amount,
          r.paid ? "To‘langan" : "Qarzdor",
          r.payment?.paidAt || "",
        ]),
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\n");
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `oqi-tolovlar-${month}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else
      await Share.share({ message: csv, title: `O‘qi · ${monthLabel(month)}` });
  };
  return (
    <Screen
      lightTop
      top={<WorkspaceHeader title="Daromad va to‘lovlar" back />}
    >
      <View style={uiStyles.between}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Moliyaviy hisobot</AppText>
          <AppText color={C.muted}>
            Guruhlaringizning oylik to‘lov daftari
          </AppText>
        </View>
        <Button
          title=""
          icon="refresh-cw"
          accessibilityLabel="To‘lovlarni yangilash"
          variant="soft"
          loading={action.busy}
          onPress={() => action.run(refresh)}
        />
      </View>
      <MonthPicker
        month={month}
        onChange={(m) => {
          setMonth(m);
          setUndo("");
        }}
      />
      <Card
        style={{ backgroundColor: C.navy, borderColor: C.navy, padding: 24 }}
      >
        <AppText variant="caption" color="#CAD6EF">
          OLINGAN DAROMAD
        </AppText>
        <AppText variant="display" color="white">
          {formatPrice(finance.received)}
        </AppText>
        <View style={[uiStyles.between, { gap: 12 }]}>
          <AppText variant="caption" color="#CAD6EF">
            {finance.paidCount} ta to‘lov · {monthLabel(month)}
          </AppText>
          <Chip label={`${finance.percent}% yig‘ildi`} tone="green" />
        </View>
        <View
          style={{
            height: 6,
            borderRadius: 6,
            backgroundColor: "#FFFFFF20",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${finance.percent}%`,
              height: 6,
              backgroundColor: C.mint,
            }}
          />
        </View>
      </Card>
      <View style={uiStyles.row}>
        <Card style={{ flex: 1 }}>
          <AppText variant="caption" color={C.muted}>
            Kutilayotgan summa
          </AppText>
          <AppText variant="heading">{formatPrice(finance.expected)}</AppText>
        </Card>
        <Card style={{ flex: 1, borderColor: "#F3CCD3" }}>
          <AppText variant="caption" color={C.muted}>
            To‘lanmagan
          </AppText>
          <AppText variant="heading" color={C.error}>
            {formatPrice(finance.outstanding)}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {finance.debtorCount} nafar qarzdor
          </AppText>
        </Card>
      </View>
      <FilterSelect
        label="Hisobot guruhi"
        value={group}
        onChange={setGroup}
        options={[
          { value: "all", label: "Barcha guruhlar" },
          ...groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />
      <Card>
        <AppText variant="heading">Daromad dinamikasi</AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 12,
            minHeight: 140,
          }}
        >
          {history.map((h) => (
            <View
              key={h.month}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <AppText variant="caption" numberOfLines={1}>
                {h.received ? `${Math.round(h.received / 1000)} ming` : "0"}
              </AppText>
              <View
                style={{
                  height: Math.max(4, (90 * h.received) / maximum),
                  minWidth: 20,
                  width: "65%",
                  borderRadius: 8,
                  backgroundColor: h.month === month ? C.primary : "#DCD7FD",
                }}
              />
              <AppText variant="caption" color={C.muted}>
                {monthLabel(h.month).split(" ")[0].slice(0, 3)}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      <View style={uiStyles.between}>
        <AppText variant="heading">To‘lovlar ro‘yxati</AppText>
        <Button
          title="Hisobot"
          icon="download"
          variant="soft"
          disabled={!rows.length}
          onPress={() => action.run(exportReport)}
        />
      </View>
      <Field
        label="To‘lovlarni qidirish"
        placeholder="O‘quvchi yoki guruh nomi"
        icon="search"
        value={query}
        onChangeText={setQuery}
      />
      <FilterOptions
        label="To‘lov holati"
        value={status}
        onChange={setStatus}
        options={filterChoices(["Barchasi", "To‘langan", "Qarzdor"])}
      />
      {rows.map((r) => {
        const key = `${r.group.id}:${r.enrollment.studentId}`;
        return (
          <Card key={key} style={{ gap: 14 }}>
            <View style={uiStyles.row}>
              <UserAvatar
                userId={r.enrollment.studentId}
                initials={r.name.slice(0, 1)}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="label" localize={false}>
                  {r.name}
                </AppText>
                <AppText variant="caption" color={C.muted} localize={false}>
                  {r.group.title}
                </AppText>
              </View>
              <Chip
                label={r.paid ? "To‘langan" : "Qarzdor"}
                tone={r.paid ? "green" : "gold"}
              />
            </View>
            <View style={uiStyles.between}>
              <AppText variant="heading">{formatPrice(r.amount)}</AppText>
              {r.payment?.paidAt ? (
                <AppText variant="caption" color={C.muted}>
                  {dateLabel(r.payment.paidAt)}
                </AppText>
              ) : null}
            </View>
            {r.amount > 0 ? (
              !r.paid ? (
                <View style={{ gap: 8 }}>
                  <Button
                    title={`${r.name}: to‘landi deb belgilash`}
                    icon="check-circle"
                    loading={action.busy}
                    onPress={() =>
                      action.run(() =>
                        command({
                          type: "payment",
                          offeringId: r.group.id,
                          studentId: r.enrollment.studentId,
                          month,
                          paid: true,
                        }),
                      )
                    }
                  />
                  <Button
                    title="To‘lovni eslatish"
                    icon="bell"
                    variant="soft"
                    disabled={action.busy || !canRemind(r.payment)}
                    onPress={() =>
                      action.run(() =>
                        command({
                          type: "payment-reminder",
                          offeringId: r.group.id,
                          month,
                          studentId: r.enrollment.studentId,
                        }),
                      )
                    }
                  />
                </View>
              ) : undo === key ? (
                <View style={{ gap: 8 }}>
                  <AppText color={C.error}>
                    To‘lov belgisini bekor qilasizmi?
                  </AppText>
                  <Button
                    title="To‘lov belgisini bekor qilishni tasdiqlash"
                    variant="outline"
                    loading={action.busy}
                    onPress={() =>
                      action.run(async () => {
                        await command({
                          type: "payment",
                          offeringId: r.group.id,
                          studentId: r.enrollment.studentId,
                          month,
                          paid: false,
                        });
                        setUndo("");
                      })
                    }
                  />
                  <Button
                    title="Bekor qilish"
                    variant="soft"
                    onPress={() => setUndo("")}
                  />
                </View>
              ) : (
                <Button
                  title={`${r.name}: to‘lov belgisini o‘zgartirish`}
                  variant="outline"
                  disabled={action.busy}
                  onPress={() => setUndo(key)}
                />
              )
            ) : null}
          </Card>
        );
      })}
      {!rows.length ? (
        <EmptyState
          title="To‘lov yozuvi topilmadi"
          subtitle="Oy, guruh yoki filtrni o‘zgartiring. Faol guruh a’zolari uchun oylik to‘lovlar shu yerda ko‘rinadi."
          icon="credit-card"
        />
      ) : null}
      <Feedback error={action.error || syncError} />
    </Screen>
  );
}
