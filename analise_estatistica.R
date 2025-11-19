# ============================================================================
# ANÁLISE ESTATÍSTICA DE DADOS DE ENERGIA
# ============================================================================
# Este script realiza análises estatísticas completas dos dados de consumo
# de energia sintéticos, incluindo testes estatísticos e visualizações.
# ============================================================================

# ----------------------------------------------------------------------------
# 1. CARREGAMENTO DE BIBLIOTECAS
# ----------------------------------------------------------------------------

# Função para instalar pacotes se não estiverem instalados
install_if_missing <- function(packages) {
  new_packages <- packages[!(packages %in% installed.packages()[,"Package"])]
  if(length(new_packages)) {
    cat("Instalando pacotes faltantes:", paste(new_packages, collapse = ", "), "\n")
    install.packages(new_packages, dependencies = TRUE, repos = "https://cran.rstudio.com/")
  }
}

# Lista de pacotes necessários
required_packages <- c("dplyr", "ggplot2", "corrplot", "car", "psych", 
                      "lubridate", "tidyr", "RColorBrewer")

# Instalar pacotes faltantes
install_if_missing(required_packages)

# Carregar bibliotecas
library(dplyr)
library(ggplot2)
library(corrplot)
library(car)
library(psych)
library(lubridate)
library(tidyr)
library(RColorBrewer)

# Configuração de tema para gráficos
theme_set(theme_minimal() + 
          theme(plot.title = element_text(size = 14, face = "bold", hjust = 0.5),
                plot.subtitle = element_text(size = 12, hjust = 0.5),
                axis.title = element_text(size = 11),
                axis.text = element_text(size = 10),
                legend.position = "bottom"))

# ----------------------------------------------------------------------------
# 2. CARREGAMENTO E PREPARAÇÃO DOS DADOS
# ----------------------------------------------------------------------------

cat("Carregando dados...\n")
df <- read.csv("energy_readings_sinteticos.csv", stringsAsFactors = FALSE)

# Converter timestamp para formato datetime
df$ts <- as.POSIXct(df$ts, format = "%Y-%m-%d %H:%M:%S")

# Criar variáveis temporais
df$data <- as.Date(df$ts)
df$hora <- hour(df$ts)
df$dia_semana <- weekdays(df$ts)
df$mes <- month(df$ts)
df$dia <- day(df$ts)

# Converter variáveis categóricas
df$device_type <- as.factor(df$device_type)
df$site_id <- as.factor(df$site_id)
df$org_id <- as.factor(df$org_id)
df$andar <- as.factor(df$andar)
df$eh_fds <- as.factor(df$eh_fds)
df$eh_horario_comercial <- as.factor(df$eh_horario_comercial)
df$is_anomaly <- as.factor(df$is_anomaly)

cat(sprintf("Dataset carregado: %d linhas, %d colunas\n", nrow(df), ncol(df)))
cat(sprintf("Período: %s a %s\n", min(df$data), max(df$data)))

# ----------------------------------------------------------------------------
# 3. ESTATÍSTICAS DESCRITIVAS GERAIS
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("ESTATÍSTICAS DESCRITIVAS GERAIS\n")
cat(rep("=", 80), "\n", sep = "")

# Estatísticas das variáveis numéricas principais
variaveis_numericas <- c("kw", "kwh_interval", "emissoes_tco2e", "temp_ext")
desc_stats <- describe(df[, variaveis_numericas])
print(desc_stats)

# Resumo por tipo de dispositivo
cat("\n", rep("-", 80), "\n", sep = "")
cat("RESUMO POR TIPO DE DISPOSITIVO\n")
cat(rep("-", 80), "\n", sep = "")

resumo_tipo <- df %>%
  group_by(device_type) %>%
  summarise(
    n = n(),
    media_kw = mean(kw, na.rm = TRUE),
    mediana_kw = median(kw, na.rm = TRUE),
    desvio_kw = sd(kw, na.rm = TRUE),
    min_kw = min(kw, na.rm = TRUE),
    max_kw = max(kw, na.rm = TRUE),
    total_kwh = sum(kwh_interval, na.rm = TRUE),
    total_emissoes = sum(emissoes_tco2e, na.rm = TRUE),
    .groups = 'drop'
  ) %>%
  arrange(desc(media_kw))

print(resumo_tipo)

# Resumo por site
cat("\n", rep("-", 80), "\n", sep = "")
cat("RESUMO POR SITE\n")
cat(rep("-", 80), "\n", sep = "")

resumo_site <- df %>%
  group_by(site_id) %>%
  summarise(
    n = n(),
    media_kw = mean(kw, na.rm = TRUE),
    mediana_kw = median(kw, na.rm = TRUE),
    desvio_kw = sd(kw, na.rm = TRUE),
    total_kwh = sum(kwh_interval, na.rm = TRUE),
    total_emissoes = sum(emissoes_tco2e, na.rm = TRUE),
    .groups = 'drop'
  )

print(resumo_site)

# ----------------------------------------------------------------------------
# 4. ANÁLISE DE DISTRIBUIÇÕES
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("ANÁLISE DE DISTRIBUIÇÕES\n")
cat(rep("=", 80), "\n", sep = "")

# Teste de normalidade (Shapiro-Wilk em amostra)
cat("\nTeste de Normalidade (Shapiro-Wilk) - Amostra de 5000 observações:\n")
amostra <- sample_n(df, min(5000, nrow(df)))
shapiro_kw <- shapiro.test(amostra$kw)
cat(sprintf("Consumo (kW): W = %.4f, p-value = %.2e\n", 
            shapiro_kw$statistic, shapiro_kw$p.value))

# Teste de normalidade para temperatura
shapiro_temp <- shapiro.test(amostra$temp_ext)
cat(sprintf("Temperatura Externa: W = %.4f, p-value = %.2e\n", 
            shapiro_temp$statistic, shapiro_temp$p.value))

# ----------------------------------------------------------------------------
# 5. TESTES ESTATÍSTICOS - COMPARAÇÕES ENTRE GRUPOS
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("TESTES ESTATÍSTICOS - COMPARAÇÕES ENTRE GRUPOS\n")
cat(rep("=", 80), "\n", sep = "")

# 5.1. Teste t ou Mann-Whitney: Fins de semana vs Dias úteis
cat("\n1. Comparação: Fins de Semana vs Dias Úteis\n")
consumo_fds <- df$kw[df$eh_fds == 1]
consumo_util <- df$kw[df$eh_fds == 0]

# Teste de Levene para homogeneidade de variâncias
levene_fds <- leveneTest(kw ~ eh_fds, data = df)
cat(sprintf("   Teste de Levene: F = %.4f, p-value = %.2e\n", 
            levene_fds$`F value`[1], levene_fds$`Pr(>F)`[1]))

# Teste Mann-Whitney (não-paramétrico, mais apropriado para dados não-normais)
wilcox_fds <- wilcox.test(consumo_fds, consumo_util)
cat(sprintf("   Teste Mann-Whitney: W = %.0f, p-value = %.2e\n", 
            wilcox_fds$statistic, wilcox_fds$p.value))

# 5.2. ANOVA ou Kruskal-Wallis: Comparação entre tipos de dispositivo
cat("\n2. Comparação entre Tipos de Dispositivo\n")

# Teste de Kruskal-Wallis (não-paramétrico)
kruskal_tipo <- kruskal.test(kw ~ device_type, data = df)
cat(sprintf("   Teste Kruskal-Wallis: H = %.4f, p-value = %.2e\n", 
            kruskal_tipo$statistic, kruskal_tipo$p.value))

# Teste post-hoc (Dunn)
if (kruskal_tipo$p.value < 0.05) {
  cat("   Diferenças significativas encontradas entre grupos\n")
}

# 5.3. Comparação: Horário comercial vs Não comercial
cat("\n3. Comparação: Horário Comercial vs Não Comercial\n")
consumo_comercial <- df$kw[df$eh_horario_comercial == 1]
consumo_nao_comercial <- df$kw[df$eh_horario_comercial == 0]

wilcox_comercial <- wilcox.test(consumo_comercial, consumo_nao_comercial)
cat(sprintf("   Teste Mann-Whitney: W = %.0f, p-value = %.2e\n", 
            wilcox_comercial$statistic, wilcox_comercial$p.value))

# 5.4. Comparação entre sites
cat("\n4. Comparação entre Sites\n")
kruskal_site <- kruskal.test(kw ~ site_id, data = df)
cat(sprintf("   Teste Kruskal-Wallis: H = %.4f, p-value = %.2e\n", 
            kruskal_site$statistic, kruskal_site$p.value))

# ----------------------------------------------------------------------------
# 6. ANÁLISE DE CORRELAÇÕES
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("ANÁLISE DE CORRELAÇÕES\n")
cat(rep("=", 80), "\n", sep = "")

# Matriz de correlação
# Criar variáveis numéricas para correlação
df$andar_num <- as.numeric(as.character(df$andar))
df$eh_fds_num <- as.numeric(as.character(df$eh_fds))
df$eh_horario_comercial_num <- as.numeric(as.character(df$eh_horario_comercial))
df$is_anomaly_num <- as.numeric(as.character(df$is_anomaly))

variaveis_corr <- df %>%
  select(kw, kwh_interval, emissoes_tco2e, temp_ext, andar_num, 
         eh_fds_num, eh_horario_comercial_num, is_anomaly_num)

matriz_corr <- cor(variaveis_corr, use = "complete.obs")
cat("\nMatriz de Correlação:\n")
print(round(matriz_corr, 3))

# Teste de correlação de Pearson
cat("\nTestes de Correlação de Pearson:\n")
cor_temp_kw <- cor.test(df$temp_ext, df$kw, method = "pearson")
cat(sprintf("   Temperatura vs Consumo: r = %.4f, p-value = %.2e\n", 
            cor_temp_kw$estimate, cor_temp_kw$p.value))

cor_kwh_emissoes <- cor.test(df$kwh_interval, df$emissoes_tco2e, method = "pearson")
cat(sprintf("   kWh vs Emissões: r = %.4f, p-value = %.2e\n", 
            cor_kwh_emissoes$estimate, cor_kwh_emissoes$p.value))

# ----------------------------------------------------------------------------
# 7. ANÁLISE DE ANOMALIAS
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("ANÁLISE DE ANOMALIAS\n")
cat(rep("=", 80), "\n", sep = "")

# Estatísticas de anomalias
anomalias <- df %>% filter(is_anomaly == 1)
normais <- df %>% filter(is_anomaly == 0)

cat(sprintf("\nTotal de anomalias: %d (%.2f%%)\n", 
            nrow(anomalias), 100 * nrow(anomalias) / nrow(df)))

cat("\nComparação Normal vs Anomalia:\n")
cat(sprintf("   Consumo médio - Normal: %.2f kW\n", mean(normais$kw)))
cat(sprintf("   Consumo médio - Anomalia: %.2f kW\n", mean(anomalias$kw)))

# Teste estatístico
wilcox_anomalia <- wilcox.test(normais$kw, anomalias$kw)
cat(sprintf("   Teste Mann-Whitney: W = %.0f, p-value = %.2e\n", 
            wilcox_anomalia$statistic, wilcox_anomalia$p.value))

# Anomalias por tipo de dispositivo
cat("\nAnomalias por Tipo de Dispositivo:\n")
anomalias_tipo <- anomalias %>%
  group_by(device_type) %>%
  summarise(n = n(), .groups = 'drop') %>%
  arrange(desc(n))
print(anomalias_tipo)

# ----------------------------------------------------------------------------
# 8. ANÁLISE TEMPORAL
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("ANÁLISE TEMPORAL\n")
cat(rep("=", 80), "\n", sep = "")

# Consumo diário
consumo_diario <- df %>%
  group_by(data) %>%
  summarise(
    total_kw = sum(kw),
    total_kwh = sum(kwh_interval),
    total_emissoes = sum(emissoes_tco2e),
    temp_media = mean(temp_ext),
    .groups = 'drop'
  )

cat("\nEstatísticas do Consumo Diário:\n")
cat(sprintf("   Média diária: %.2f kW\n", mean(consumo_diario$total_kw)))
cat(sprintf("   Desvio padrão: %.2f kW\n", sd(consumo_diario$total_kw)))
cat(sprintf("   Mínimo: %.2f kW\n", min(consumo_diario$total_kw)))
cat(sprintf("   Máximo: %.2f kW\n", max(consumo_diario$total_kw)))

# Consumo por hora do dia
consumo_horario <- df %>%
  group_by(hora) %>%
  summarise(
    media_kw = mean(kw),
    mediana_kw = median(kw),
    desvio_kw = sd(kw),
    .groups = 'drop'
  )

cat("\nHora de Pico de Consumo:\n")
hora_pico <- consumo_horario[which.max(consumo_horario$media_kw), ]
cat(sprintf("   Hora: %d:00\n", hora_pico$hora))
cat(sprintf("   Consumo médio: %.2f kW\n", hora_pico$media_kw))

# Consumo por dia da semana
consumo_dia_semana <- df %>%
  group_by(dia_semana) %>%
  summarise(
    media_kw = mean(kw),
    .groups = 'drop'
  ) %>%
  arrange(desc(media_kw))

cat("\nConsumo por Dia da Semana (ordenado):\n")
print(consumo_dia_semana)

# ----------------------------------------------------------------------------
# 9. VISUALIZAÇÕES
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("GERANDO VISUALIZAÇÕES...\n")
cat(rep("=", 80), "\n", sep = "")

# Criar diretório para gráficos
if (!dir.exists("graficos")) {
  dir.create("graficos")
}

# 9.1. Distribuição de consumo por tipo de dispositivo
png("graficos/01_distribuicao_por_tipo.png", width = 1200, height = 800, res = 150)
p1 <- ggplot(df, aes(x = device_type, y = kw, fill = device_type)) +
  geom_boxplot(alpha = 0.7) +
  scale_fill_brewer(palette = "Set2") +
  labs(title = "Distribuição de Consumo por Tipo de Dispositivo",
       x = "Tipo de Dispositivo",
       y = "Consumo (kW)") +
  theme(legend.position = "none")
print(p1)
dev.off()

# 9.2. Histograma de consumo geral
png("graficos/02_histograma_consumo.png", width = 1200, height = 800, res = 150)
p2 <- ggplot(df, aes(x = kw)) +
  geom_histogram(bins = 50, fill = "steelblue", alpha = 0.7, color = "black") +
  geom_vline(aes(xintercept = mean(kw)), color = "red", linetype = "dashed", size = 1) +
  labs(title = "Distribuição Geral de Consumo (kW)",
       subtitle = paste("Média =", round(mean(df$kw), 2), "kW"),
       x = "Consumo (kW)",
       y = "Frequência")
print(p2)
dev.off()

# 9.3. Série temporal de consumo diário
png("graficos/03_serie_temporal_diaria.png", width = 1400, height = 800, res = 150)
p3 <- ggplot(consumo_diario, aes(x = data, y = total_kw)) +
  geom_line(color = "steelblue", size = 1) +
  geom_point(color = "steelblue", size = 2) +
  labs(title = "Consumo Total Diário (kW)",
       x = "Data",
       y = "Consumo Total (kW)") +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))
print(p3)
dev.off()

# 9.4. Padrão horário de consumo
png("graficos/04_padrao_horario.png", width = 1400, height = 800, res = 150)
p4 <- ggplot(consumo_horario, aes(x = hora, y = media_kw)) +
  geom_line(color = "steelblue", size = 1.5) +
  geom_point(color = "steelblue", size = 3) +
  geom_ribbon(aes(ymin = media_kw - desvio_kw, ymax = media_kw + desvio_kw), 
              alpha = 0.3, fill = "steelblue") +
  geom_vline(xintercept = c(8, 18), linetype = "dashed", color = "orange", alpha = 0.7) +
  annotate("rect", xmin = 8, xmax = 18, ymin = -Inf, ymax = Inf, 
           alpha = 0.2, fill = "yellow") +
  labs(title = "Padrão Horário Médio de Consumo",
       subtitle = "Área amarela: Horário Comercial (8h-18h)",
       x = "Hora do Dia",
       y = "Consumo Médio (kW)") +
  scale_x_continuous(breaks = 0:23)
print(p4)
dev.off()

# 9.5. Consumo por dia da semana
png("graficos/05_consumo_dia_semana.png", width = 1200, height = 800, res = 150)
ordem_dias <- c("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
consumo_dia_semana$dia_semana <- factor(consumo_dia_semana$dia_semana, levels = ordem_dias)

p5 <- ggplot(consumo_dia_semana, aes(x = dia_semana, y = media_kw, fill = dia_semana)) +
  geom_bar(stat = "identity", alpha = 0.8) +
  scale_fill_brewer(palette = "Spectral") +
  geom_text(aes(label = round(media_kw, 2)), vjust = -0.5, size = 3.5) +
  labs(title = "Consumo Médio por Dia da Semana",
       x = "Dia da Semana",
       y = "Consumo Médio (kW)") +
  theme(legend.position = "none", axis.text.x = element_text(angle = 45, hjust = 1))
print(p5)
dev.off()

# 9.6. Consumo vs Temperatura
png("graficos/06_consumo_vs_temperatura.png", width = 1400, height = 800, res = 150)
p6 <- ggplot(df, aes(x = temp_ext, y = kw)) +
  geom_point(alpha = 0.1, size = 0.5, color = "steelblue") +
  geom_smooth(method = "lm", color = "red", se = TRUE) +
  labs(title = "Consumo vs Temperatura Externa",
       subtitle = paste("Correlação: r =", round(cor_temp_kw$estimate, 3)),
       x = "Temperatura Externa (°C)",
       y = "Consumo (kW)")
print(p6)
dev.off()

# 9.7. Comparação Fins de Semana vs Dias Úteis
png("graficos/07_fds_vs_util.png", width = 1400, height = 800, res = 150)
consumo_horario_comparacao <- df %>%
  group_by(hora, eh_fds) %>%
  summarise(media_kw = mean(kw), .groups = 'drop')
consumo_horario_comparacao$eh_fds <- factor(consumo_horario_comparacao$eh_fds, 
                                            levels = c(0, 1),
                                            labels = c("Dias Úteis", "Fins de Semana"))

p7 <- ggplot(consumo_horario_comparacao, aes(x = hora, y = media_kw, color = eh_fds)) +
  geom_line(size = 1.2) +
  geom_point(size = 2.5) +
  scale_color_manual(values = c("blue", "orange")) +
  labs(title = "Consumo Horário: Fins de Semana vs Dias Úteis",
       x = "Hora do Dia",
       y = "Consumo Médio (kW)",
       color = "Tipo de Dia") +
  scale_x_continuous(breaks = 0:23)
print(p7)
dev.off()

# 9.8. Matriz de correlação
png("graficos/08_matriz_correlacao.png", width = 1200, height = 1200, res = 150)
colnames(matriz_corr) <- c("kW", "kWh", "Emissões", "Temp", "Andar", "FDS", "Comercial", "Anomalia")
rownames(matriz_corr) <- colnames(matriz_corr)
corrplot(matriz_corr, method = "color", type = "upper", 
         order = "hclust", tl.cex = 0.8, tl.col = "black",
         addCoef.col = "black", number.cex = 0.7,
         title = "Matriz de Correlação", mar = c(0,0,2,0))
dev.off()

# 9.9. Anomalias por tipo de dispositivo
png("graficos/09_anomalias_por_tipo.png", width = 1200, height = 800, res = 150)
p9 <- ggplot(anomalias_tipo, aes(x = reorder(device_type, n), y = n, fill = device_type)) +
  geom_bar(stat = "identity", alpha = 0.8) +
  scale_fill_brewer(palette = "Reds") +
  geom_text(aes(label = n), hjust = -0.2, size = 4) +
  coord_flip() +
  labs(title = "Número de Anomalias por Tipo de Dispositivo",
       x = "Tipo de Dispositivo",
       y = "Número de Anomalias") +
  theme(legend.position = "none")
print(p9)
dev.off()

# 9.10. Heatmap de consumo por hora e tipo (horário comercial)
png("graficos/10_heatmap_horario_tipo.png", width = 1400, height = 800, res = 150)
consumo_heatmap <- df %>%
  filter(eh_horario_comercial == 1) %>%
  group_by(device_type, hora) %>%
  summarise(media_kw = mean(kw), .groups = 'drop')

p10 <- ggplot(consumo_heatmap, aes(x = hora, y = device_type, fill = media_kw)) +
  geom_tile() +
  scale_fill_gradient(low = "white", high = "red", name = "Consumo\n(kW)") +
  labs(title = "Heatmap: Consumo por Tipo e Hora (Horário Comercial)",
       x = "Hora do Dia",
       y = "Tipo de Dispositivo") +
  scale_x_continuous(breaks = seq(8, 18, 2))
print(p10)
dev.off()

cat("\nGráficos salvos na pasta 'graficos/'\n")

# ----------------------------------------------------------------------------
# 10. RESUMO FINAL
# ----------------------------------------------------------------------------

cat("\n", rep("=", 80), "\n", sep = "")
cat("RESUMO FINAL DA ANÁLISE\n")
cat(rep("=", 80), "\n", sep = "")

cat("\nPrincipais Descobertas:\n")
cat("1. Consumo médio geral:", round(mean(df$kw), 2), "kW\n")
cat("2. Tipo de dispositivo com maior consumo:", 
    as.character(resumo_tipo$device_type[1]), "\n")
cat("3. Hora de pico:", hora_pico$hora, ":00\n")
cat("4. Correlação temperatura-consumo:", round(cor_temp_kw$estimate, 3), "\n")
cat("5. Percentual de anomalias:", round(100 * nrow(anomalias) / nrow(df), 2), "%\n")

cat("\nAnálise estatística concluída!\n")
cat("Arquivos gerados na pasta 'graficos/'\n")

