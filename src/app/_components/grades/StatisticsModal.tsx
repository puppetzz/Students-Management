"use client";

import { Modal, Text, Stack, Group, Badge, RingProgress } from "@mantine/core";
import { GRADE_CLASSIFICATIONS } from "common/constants/students";
import { api } from "~/trpc/react";

interface StatisticsModalProps {
  opened: boolean;
  onClose: () => void;
  classId: number | null;
  className?: string;
  termName?: string;
}

export const StatisticsModal = ({
  opened,
  onClose,
  classId,
  className,
  termName,
}: StatisticsModalProps) => {
  const { data: statistics, isLoading } =
    api.classes.getGradeStatistics.useQuery(
      {
        classId: classId!,
      },
      {
        enabled: !!classId && opened,
      },
    );

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case "EXCELLENT":
        return "#be4bdb";
      case "VERY_GOOD":
        return "#51cf66";
      case "GOOD":
        return "#339af0";
      case "FAIRLY_GOOD":
        return "#22b8cf";
      case "AVERAGE":
        return "#ffd43b";
      case "FAILED":
        return "#ff6b6b";
      default:
        return "#868e96";
    }
  };

  const renderStatistics = (
    stats: Record<string, { count: number; percentage: number }>,
    title: string,
  ) => {
    const sortedStats = Object.entries(stats).sort((a, b) => {
      const order = [
        "EXCELLENT",
        "VERY_GOOD",
        "GOOD",
        "FAIRLY_GOOD",
        "AVERAGE",
        "FAILED",
      ];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });

    if (sortedStats.length === 0) {
      return (
        <Stack gap="md">
          <Text size="lg" fw={600}>
            {title}
          </Text>
          <Text c="dimmed" size="sm">
            Chưa có dữ liệu xếp loại
          </Text>
        </Stack>
      );
    }

    const chartData = sortedStats.map(([classification, data]) => ({
      value: data.percentage,
      color: getClassificationColor(classification),
      tooltip: `${GRADE_CLASSIFICATIONS[classification as keyof typeof GRADE_CLASSIFICATIONS]}: ${data.percentage.toFixed(1)}%`,
    }));

    return (
      <Stack gap="md">
        <Text size="lg" fw={600}>
          {title}
        </Text>
        <Group align="flex-start" gap="xl">
          <RingProgress
            size={220}
            thickness={28}
            sections={chartData}
            label={
              <div style={{ textAlign: "center" }}>
                <Text size="xl" fw={700}>
                  {statistics?.total ?? 0}
                </Text>
                <Text size="xs" c="dimmed">
                  Học viên
                </Text>
              </div>
            }
          />
          <Stack gap="xs" style={{ flex: 1 }}>
            {sortedStats.map(([classification, data]) => (
              <Group key={classification} justify="space-between" gap="md">
                <Group gap="xs">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: getClassificationColor(classification),
                    }}
                  />
                  <Badge variant="light" size="lg">
                    {
                      GRADE_CLASSIFICATIONS[
                        classification as keyof typeof GRADE_CLASSIFICATIONS
                      ]
                    }
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    {data.count} Học viên
                  </Text>
                  <Text size="sm" fw={600}>
                    {data.percentage.toFixed(1)}%
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        </Group>
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text size="xl" fw={700}>
          Thống Kê Xếp Loại
          {className ? ` - Lớp ${className} - Khóa ${termName}` : ""}
        </Text>
      }
      size="lg"
      centered
    >
      {isLoading ? (
        <Text c="dimmed">Đang tải...</Text>
      ) : statistics ? (
        <Stack gap="xl">
          <div className="flex gap-1">
            <Text size="md" fw={500}>
              Tổng số học viên:
            </Text>
            <span className="font-bold">{statistics.total}</span>
          </div>

          {renderStatistics(
            statistics.currentClassificationStats,
            "Xếp Loại Hiện Tại",
          )}

          <div
            style={{ borderTop: "1px solid #dee2e6", marginTop: "8px" }}
          ></div>

          {renderStatistics(
            statistics.finalClassificationStats,
            "Xếp Loại Cuối Khóa",
          )}
        </Stack>
      ) : (
        <Text c="dimmed">Không có dữ liệu</Text>
      )}
    </Modal>
  );
};
