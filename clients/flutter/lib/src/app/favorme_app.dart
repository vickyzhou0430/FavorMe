import 'package:flutter/material.dart';

import '../features/insight/device_id_store.dart';
import '../features/insight/insight_api_client.dart';
import '../features/insight/insight_flow_screen.dart';
import '../features/insight/insight_view_model.dart';
import '../theme/app_theme.dart';

class FavorMeApp extends StatefulWidget {
  const FavorMeApp({
    super.key,
    this.questionsClient,
    this.deviceIdStore,
  });

  final InsightQuestionsClient? questionsClient;
  final DeviceIdStore? deviceIdStore;

  @override
  State<FavorMeApp> createState() => _FavorMeAppState();
}

class _FavorMeAppState extends State<FavorMeApp> {
  late final DeviceIdStore _deviceIdStore;
  late final InsightQuestionsClient _questionsClient;
  late final InsightViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _deviceIdStore = widget.deviceIdStore ?? FileDeviceIdStore();
    _questionsClient =
        widget.questionsClient ?? _createDefaultClient(_deviceIdStore);
    _viewModel = InsightViewModel(questionsClient: _questionsClient);
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
      home: InsightFlowScreen(viewModel: _viewModel),
    );
  }

  InsightApiClient _createDefaultClient(DeviceIdStore deviceIdStore) {
    const baseUrl = String.fromEnvironment(
      'FAVORME_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    );
    const apiToken = String.fromEnvironment('FAVORME_API_TOKEN');
    return InsightApiClient(
      baseUrl: baseUrl,
      apiToken: apiToken,
      deviceIdStore: deviceIdStore,
    );
  }
}
