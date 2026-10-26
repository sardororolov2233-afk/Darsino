import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import {
  canRemind,
  groupPaymentRows,
  monthLabel,
  paymentMonth,
  paymentSummary,
  shiftMonth,
  validPaymentMonth,
} from "../state/payments";
import { dateLabel, dmId, type Offering } from "../state/domain";
import { matchesSearch } from "../state/learning";
import { formatPrice } from "../data/catalog";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Icon,
  uiStyles,
} from "./ui";
import { FilterOptions, filterChoices } from "./FilterControls";
import { Feedback, useAction } from "./feedback";
import { C } from "../theme";

export function MonthPicker({
  month,
  onChange,
}: {
  month: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.month}>
      <Button
        title=""
        icon="chevron-left"
        accessibilityLabel="Oldingi oy"
        variant="soft"
        disabled={month === "2000-01"}
        onPress={() => onChange(shiftMonth(month, -1))}
        style={styles.arrow}
      />
      <View style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 2 }}>
        <AppText variant="label">{monthLabel(month)}</AppText>
        <AppText variant="caption" color={C.muted}>
          Oylik to‘lov hisoboti
        </AppText>
      </View>
      <Button
        title=""
        icon="chevron-right"
        accessibilityLabel="Keyingi oy"
        variant="soft"
        disabled={month === "2099-12"}
        onPress={() => onChange(shiftMonth(month, 1))}
        style={styles.arrow}
      />
    </View>
  );
}

export function GroupPayments({
  group,
  initialMonth,
  initialStatus,
}: {
  group: Offering;
  initialMonth?: string;
  initialStatus?: string;
}) {
  const { market, command, user } = useApp();
  const navigation = useAppNavigation(),
    action = useAction();
  const [month, setMonth] = useState(
      initialMonth && validPaymentMonth(initialMonth)
        ? initialMonth
        : paymentMonth,
    ),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(initialStatus || "Barchasi");
  const rows = groupPaymentRows(market, group.id, month);
  const summary = paymentSummary(market, user.id, month, group.id);
  const visible = rows.filter(
    (r) =>
      matchesSearch(r.name, query) &&
      (status === "Barchasi" ||
        (status === "To‘lagan" && r.paid) ||
        (status === "Qarzdor" && !r.paid)),
  );
  const remindable = rows.filter(
    (r) => !r.paid && r.enrollment.active && canRemind(r.payment),
  );
  const approved = market.tutorProfiles.some(
    (p) => p.userId === user.id && p.verification === "approved",
  );
  return (
    <View style={{ gap: 14 }}>
      <MonthPicker month={month} onChange={setMonth} />
      <View style={uiStyles.wrap}>
        {[
          { label: "Kutilgan", value: summary.expected, color: C.ink },
          { label: "To‘langan", value: summary.received, color: C.green },
          { label: "Qoldiq", value: summary.outstanding, color: C.error },
        ].map((s) => (
          <Card key={s.label} style={styles.total}>
            <AppText variant="caption" color={C.muted}>
              {s.label}
            </AppText>
            <AppText variant="label" color={s.color}>
              {formatPrice(s.value)}
            </AppText>
          </Card>
        ))}
      </View>
      <Card style={{ gap: 12 }}>
        <Field
          icon="search"
          placeholder="O‘quvchi ismi yoki familiyasi"
          value={query}
          onChangeText={setQuery}
        />
        <FilterOptions
          label="To‘lov holati"
          options={filterChoices(["Barchasi", "To‘lagan", "Qarzdor"])}
          value={status}
          onChange={setStatus}
        />
        <AppText variant="caption" color={C.muted}>
          {rows.length} o‘quvchi · {summary.paidCount} to‘lagan ·{" "}
          {summary.unpaidCount} qarzdor
        </AppText>
        <Button
          title={`Qarzdorlarga eslatma · ${remindable.length}`}
          icon="bell"
          variant="gold"
          disabled={!approved || !remindable.length}
          loading={action.busy}
          onPress={() =>
            action.run(
              () =>
                command({
                  type: "payment-reminder",
                  offeringId: group.id,
                  month,
                }),
              () =>
                action.setSuccess(
                  "To‘lov eslatmalari o‘quvchilarning bildirishnomalariga yuborildi.",
                ),
            )
          }
        />
      </Card>
      <Feedback {...action} />
      {visible.length ? (
        <>
          <View style={uiStyles.row}>
            <Icon name="move" size={15} color={C.muted} />
            <AppText variant="caption" color={C.muted}>
              To‘liq jadval uchun yon tomonga suring
            </AppText>
          </View>
          <View style={styles.tableClip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              nestedScrollEnabled
            >
              <View style={{ width: 760 }}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <AppText variant="label" style={styles.name}>
                    Ism va familiya
                  </AppText>
                  <AppText variant="label" style={styles.amount}>
                    Oylik to‘lov
                  </AppText>
                  <AppText variant="label" style={styles.state}>
                    Holati / sana
                  </AppText>
                  <AppText variant="label" style={styles.actions}>
                    Amallar
                  </AppText>
                </View>
                {visible.map((r) => (
                  <View
                    key={r.enrollment.id}
                    testID={`payment-row-${r.enrollment.studentId}`}
                    style={styles.tableRow}
                  >
                    <View style={styles.name}>
                      <AppText variant="label">{r.name}</AppText>
                      <AppText variant="caption" color={C.muted}>
                        {r.enrollment.active
                          ? "Faol o‘quvchi"
                          : "Guruhdan chiqqan"}
                      </AppText>
                      <Button
                        title="Yozish"
                        variant="soft"
                        accessibilityLabel={`${r.name}: yozish`}
                        onPress={() =>
                          navigation.navigate("Conversation", {
                            id: dmId(r.enrollment.studentId, user.id),
                          })
                        }
                        style={{
                          minHeight: 36,
                          alignSelf: "flex-start",
                          paddingHorizontal: 10,
                          marginTop: 4,
                        }}
                      />
                    </View>
                    <AppText style={styles.amount}>
                      {formatPrice(r.amount)}
                    </AppText>
                    <View style={styles.state}>
                      <Chip
                        label={
                          r.amount === 0
                            ? "Bepul"
                            : r.paid
                              ? "To‘ladi"
                              : "To‘lamadi"
                        }
                        tone={r.paid ? "green" : "gold"}
                      />
                      {r.payment?.paidAt ? (
                        <AppText variant="caption" color={C.muted}>
                          {dateLabel(r.payment.paidAt)}
                        </AppText>
                      ) : null}
                      {!r.paid && r.payment?.remindedAt ? (
                        <AppText variant="caption" color={C.muted}>
                          Eslatildi: {dateLabel(r.payment.remindedAt)}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.actions}>
                      {r.amount > 0 ? (
                        <Button
                          title={
                            r.paid
                              ? "To‘lamadi deb tuzatish"
                              : "To‘ladi deb belgilash"
                          }
                          accessibilityLabel={`${r.name}: ${r.paid ? "to‘lov belgisini bekor qilish" : "to‘ladi deb belgilash"}`}
                          variant={r.paid ? "outline" : "primary"}
                          disabled={!approved || action.busy}
                          onPress={() =>
                            action.run(
                              () =>
                                command({
                                  type: "payment",
                                  offeringId: group.id,
                                  studentId: r.enrollment.studentId,
                                  month,
                                  paid: !r.paid,
                                }),
                              () =>
                                action.setSuccess("To‘lov holati saqlandi."),
                            )
                          }
                          style={styles.rowButton}
                        />
                      ) : null}
                      {!r.paid && r.enrollment.active ? (
                        <Button
                          title={
                            canRemind(r.payment)
                              ? "To‘lovni eslatish"
                              : "Eslatma yuborilgan"
                          }
                          accessibilityLabel={`${r.name}: to‘lovni eslatish`}
                          icon="bell"
                          variant="soft"
                          disabled={
                            !approved || action.busy || !canRemind(r.payment)
                          }
                          onPress={() =>
                            action.run(
                              () =>
                                command({
                                  type: "payment-reminder",
                                  offeringId: group.id,
                                  studentId: r.enrollment.studentId,
                                  month,
                                }),
                              () =>
                                action.setSuccess(
                                  "O‘quvchiga to‘lov eslatmasi yuborildi.",
                                ),
                            )
                          }
                          style={styles.rowButton}
                        />
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      ) : (
        <EmptyState
          title={
            rows.length
              ? "Filtrga mos o‘quvchi yo‘q"
              : "Bu oy uchun o‘quvchilar yo‘q"
          }
          subtitle={
            rows.length
              ? "Ism yoki to‘lov holati filtrini o‘zgartiring."
              : "Guruhga tasdiqlangan o‘quvchilar tanlangan oy jadvalida ko‘rinadi."
          }
          icon="users"
        />
      )}
      <AppText variant="caption" color={C.muted}>
        To‘lov holatini ustoz belgilaydi. Eslatma har bir o‘quvchiga 24 soatda
        bir marta yuboriladi.
      </AppText>
    </View>
  );
}

export function StudentPayments() {
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const [month, setMonth] = useState(paymentMonth);
  const ownGroups = new Set(
    market.enrollments
      .filter((e) => e.studentId === user.id)
      .map((e) => e.offeringId),
  );
  const groups = market.offerings
    .filter((g) => ownGroups.has(g.id))
    .flatMap((group) => {
      const row = groupPaymentRows(market, group.id, month).find(
        (r) => r.enrollment.studentId === user.id,
      );
      return row ? [{ group, row }] : [];
    });
  return (
    <View style={{ gap: 14 }}>
      <MonthPicker month={month} onChange={setMonth} />
      {groups.map(({ group, row }) => (
        <Card key={group.id}>
          <AppText variant="heading">{group.title}</AppText>
          <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
            <AppText variant="label">{formatPrice(row.amount)}</AppText>
            <Chip
              label={
                row.amount === 0
                  ? "Bepul"
                  : row.paid
                    ? "To‘ladi"
                    : "To‘lov kutilmoqda"
              }
              tone={row.paid ? "green" : "gold"}
            />
          </View>
          <AppText variant="caption" color={C.muted}>
            {row.payment?.paidAt
              ? `Ustoz qayd etgan sana: ${dateLabel(row.payment.paidAt)}`
              : "To‘lov holatini ustozingiz yangilaydi."}
          </AppText>
          <Button
            title="Ustozga yozish"
            icon="message-circle"
            variant="soft"
            onPress={() =>
              navigation.navigate("Conversation", {
                id: dmId(user.id, group.tutorId),
              })
            }
          />
        </Card>
      ))}
      {!groups.length ? (
        <EmptyState
          title="To‘lov ma’lumoti yo‘q"
          subtitle="Tasdiqlangan guruhlaringizning oylik to‘lov holati shu yerda ko‘rinadi."
          icon="credit-card"
        />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.white,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  arrow: { width: 44, minHeight: 44, paddingHorizontal: 0, borderRadius: 12 },
  total: {
    flexBasis: "30%",
    flexGrow: 1,
    minWidth: 85,
    padding: 10,
    borderRadius: 16,
    gap: 4,
  },
  tableClip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: C.white,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    minHeight: 86,
  },
  tableHead: { minHeight: 50, backgroundColor: C.blueSoft },
  name: { width: 190, gap: 3 },
  amount: { width: 115 },
  state: { width: 160, gap: 6 },
  actions: { width: 215, gap: 8 },
  rowButton: { minHeight: 40, paddingHorizontal: 10, borderRadius: 12 },
});
