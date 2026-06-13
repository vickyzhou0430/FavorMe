import 'package:flutter/material.dart';

import '../features/insight/device_id_store.dart';
import '../features/insight_v2/insight_v2_api_client.dart';
import '../features/insight_v2/insight_v2_screen.dart';
import '../features/insight_v2/insight_v2_view_model.dart';
import '../theme/app_theme.dart';

class FavorMeApp extends StatefulWidget {
  const FavorMeApp({
    super.key,
    this.insightV2Client,
    this.deviceIdStore,
  });

  /// 注入用于测试；为空时按 `--dart-define` 构建默认 HTTP 客户端。
  final InsightV2Client? insightV2Client;
  final DeviceIdStore? deviceIdStore;

  @override
  State<FavorMeApp> createState() => _FavorMeAppState();
}

class _FavorMeAppState extends State<FavorMeApp> {
  late final DeviceIdStore _deviceIdStore;
  late final InsightV2Client _client;
  late final InsightV2ViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _deviceIdStore = widget.deviceIdStore ?? FileDeviceIdStore();
    _client = widget.insightV2Client ?? _createDefaultClient(_deviceIdStore);
    _viewModel = InsightV2ViewModel(client: _client);
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FavorMe',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: InsightV2Screen(viewModel: _viewModel, client: _client),
    );
  }

  InsightV2ApiClient _createDefaultClient(DeviceIdStore deviceIdStore) {
    const baseUrl = String.fromEnvironment(
      'FAVORME_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    );
    const apiToken = String.fromEnvironment('FAVORME_API_TOKEN');
    return InsightV2ApiClient(
      baseUrl: baseUrl,
      apiToken: apiToken,
      deviceIdStore: deviceIdStore,
    );
  }
}
