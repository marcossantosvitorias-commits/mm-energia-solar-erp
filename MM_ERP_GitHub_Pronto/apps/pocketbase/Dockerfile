FROM alpine:3.20

ARG PB_VERSION=0.39.9
ARG TARGETARCH

RUN apk add --no-cache ca-certificates unzip wget \
  && case "$TARGETARCH" in \
       amd64) PB_ARCH=amd64 ;; \
       arm64) PB_ARCH=arm64 ;; \
       *) echo "Arquitetura não suportada: $TARGETARCH" && exit 1 ;; \
     esac \
  && wget -O /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
  && unzip /tmp/pocketbase.zip -d /pb \
  && rm /tmp/pocketbase.zip

WORKDIR /pb

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

RUN mkdir -p /pb/pb_data

EXPOSE 8090

ENV PB_ENCRYPTION_KEY=""

CMD ["/bin/sh", "-c", "/pb/pocketbase serve --http=0.0.0.0:8090 --encryptionEnv=PB_ENCRYPTION_KEY"]
