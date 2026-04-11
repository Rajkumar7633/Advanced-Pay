package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Logger struct {
	*zap.SugaredLogger
}

func NewLogger() *Logger {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	logger, _ := config.Build()
	return &Logger{logger.Sugar()}
}

func (l *Logger) Sync() error {
	if l == nil || l.SugaredLogger == nil {
		return nil
	}
	return l.SugaredLogger.Desugar().Sync()
}

func (l *Logger) Info(msg string, keysAndValues ...interface{}) {
	if l == nil || l.SugaredLogger == nil {
		return
	}
	l.SugaredLogger.Infow(msg, keysAndValues...)
}

func (l *Logger) Error(msg string, keysAndValues ...interface{}) {
	if l == nil || l.SugaredLogger == nil {
		return
	}
	l.SugaredLogger.Errorw(msg, keysAndValues...)
}

func (l *Logger) Fatal(msg string, keysAndValues ...interface{}) {
	if l == nil || l.SugaredLogger == nil {
		return
	}
	l.SugaredLogger.Fatalw(msg, keysAndValues...)
}

func (l *Logger) Warnw(msg string, keysAndValues ...interface{}) {
	if l == nil || l.SugaredLogger == nil {
		return
	}
	l.SugaredLogger.Warnw(msg, keysAndValues...)
}
