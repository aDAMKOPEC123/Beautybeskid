"""Small inference-only model definitions matching the published checkpoints.

The acne checkpoint comes from openface-io/acne-lds (MIT). The wrinkle
checkpoint comes from labhai/ffhq-wrinkle-dataset (research/non-commercial
dataset terms). See THIRD_PARTY_MODELS.md before any production use.
"""

from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F


class AcneBottleneck(nn.Module):
    expansion = 4

    def __init__(self, in_channels: int, channels: int, stride: int = 1, downsample: nn.Module | None = None):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, channels, kernel_size=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)
        self.conv3 = nn.Conv2d(channels, channels * 4, kernel_size=1, bias=False)
        self.bn3 = nn.BatchNorm2d(channels * 4)
        self.relu = nn.ReLU(inplace=True)
        self.downsample = downsample

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        residual = tensor
        output = self.relu(self.bn1(self.conv1(tensor)))
        output = self.relu(self.bn2(self.conv2(output)))
        output = self.bn3(self.conv3(output))
        if self.downsample is not None:
            residual = self.downsample(tensor)
        return self.relu(output + residual)


class AcneLdsResNet50(nn.Module):
    def __init__(self):
        super().__init__()
        self.inplanes = 64
        self.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        self.layer1 = self._make_layer(64, 3)
        self.layer2 = self._make_layer(128, 4, stride=2)
        self.layer3 = self._make_layer(256, 6, stride=2)
        self.layer4 = self._make_layer(512, 3, stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(2048, 13)
        self.counting = nn.Linear(2048, 65)

    def _make_layer(self, channels: int, blocks: int, stride: int = 1) -> nn.Sequential:
        downsample = None
        if stride != 1 or self.inplanes != channels * AcneBottleneck.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(self.inplanes, channels * AcneBottleneck.expansion, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(channels * AcneBottleneck.expansion),
            )
        layers: list[nn.Module] = [AcneBottleneck(self.inplanes, channels, stride, downsample)]
        self.inplanes = channels * AcneBottleneck.expansion
        layers.extend(AcneBottleneck(self.inplanes, channels) for _ in range(1, blocks))
        return nn.Sequential(*layers)

    def forward(self, tensor: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        tensor = self.maxpool(self.relu(self.bn1(self.conv1(tensor))))
        tensor = self.layer4(self.layer3(self.layer2(self.layer1(tensor))))
        tensor = self.avgpool(tensor).flatten(1)
        severity_13 = F.softmax(self.fc(tensor), dim=1) + 1e-4
        count = F.softmax(self.counting(tensor), dim=1) + 1e-4
        severity_from_count = torch.stack(
            (
                count[:, :5].sum(1),
                count[:, 5:20].sum(1),
                count[:, 20:50].sum(1),
                count[:, 50:].sum(1),
            ),
            dim=1,
        )
        return severity_13, count, severity_from_count


class DoubleConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, mid_channels: int | None = None):
        super().__init__()
        mid_channels = mid_channels or out_channels
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, mid_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(mid_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        return self.double_conv(tensor)


class Down(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.maxpool_conv = nn.Sequential(nn.MaxPool2d(2), DoubleConv(in_channels, out_channels))

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        return self.maxpool_conv(tensor)


class Up(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=True)
        self.conv = DoubleConv(in_channels, out_channels, in_channels // 2)

    def forward(self, lower: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        lower = self.up(lower)
        diff_y = skip.size(2) - lower.size(2)
        diff_x = skip.size(3) - lower.size(3)
        lower = F.pad(lower, [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2])
        return self.conv(torch.cat([skip, lower], dim=1))


class OutConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        return self.conv(tensor)


class WrinkleUNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.inc = DoubleConv(4, 64)
        self.down1 = Down(64, 128)
        self.down2 = Down(128, 256)
        self.down3 = Down(256, 512)
        self.down4 = Down(512, 512)
        self.up1 = Up(1024, 256)
        self.up2 = Up(512, 128)
        self.up3 = Up(256, 64)
        self.up4 = Up(128, 64)
        self.outc = OutConv(64, 2)

    def forward(self, tensor: torch.Tensor) -> torch.Tensor:
        first = self.inc(tensor)
        second = self.down1(first)
        third = self.down2(second)
        fourth = self.down3(third)
        bottom = self.down4(fourth)
        output = self.up1(bottom, fourth)
        output = self.up2(output, third)
        output = self.up3(output, second)
        output = self.up4(output, first)
        return self.outc(output)
