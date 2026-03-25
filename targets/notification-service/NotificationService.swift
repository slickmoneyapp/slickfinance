import UserNotifications
import Intents

class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard #available(iOSApplicationExtension 15.0, *) else {
            contentHandler(request.content)
            return
        }

        guard let best = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        let userInfo = request.content.userInfo
        let body = userInfo["body"] as? [String: Any]

        let serviceName = (body?["serviceName"] as? String) ?? request.content.title
        let logoUrlString = body?["logoUrl"] as? String

        if let urlString = logoUrlString, let url = URL(string: urlString) {
            downloadImage(from: url) { imageData in
                self.configureCommunicationNotification(
                    request: request,
                    content: best,
                    senderName: serviceName,
                    avatarData: imageData,
                    contentHandler: contentHandler
                )
            }
        } else {
            configureCommunicationNotification(
                request: request,
                content: best,
                senderName: serviceName,
                avatarData: nil,
                contentHandler: contentHandler
            )
        }
    }

    @available(iOSApplicationExtension 15.0, *)
    private func configureCommunicationNotification(
        request: UNNotificationRequest,
        content: UNMutableNotificationContent,
        senderName: String,
        avatarData: Data?,
        contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        let handle = INPersonHandle(value: senderName, type: .unknown)

        let avatar: INImage?
        if let data = avatarData {
            avatar = INImage(imageData: data)
        } else {
            avatar = nil
        }

        let sender = INPerson(
            personHandle: handle,
            nameComponents: nil,
            displayName: senderName,
            image: avatar,
            contactIdentifier: nil,
            customIdentifier: senderName
        )

        let intent = INSendMessageIntent(
            recipients: nil,
            outgoingMessageType: .outgoingMessageText,
            content: content.body,
            speakableGroupName: nil,
            conversationIdentifier: senderName,
            serviceName: nil,
            sender: sender,
            attachments: nil
        )

        let interaction = INInteraction(intent: intent, response: nil)
        interaction.direction = .incoming

        interaction.donate { error in
            if let error = error {
                NSLog("SlickFinance NSE: Interaction donation failed: \(error)")
                contentHandler(content)
                return
            }

            do {
                let updatedContent = try request.content.updating(from: intent)
                contentHandler(updatedContent)
            } catch {
                NSLog("SlickFinance NSE: Content update failed: \(error)")
                contentHandler(content)
            }
        }
    }

    private func downloadImage(from url: URL, completion: @escaping (Data?) -> Void) {
        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            guard error == nil,
                  let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200,
                  let data = data else {
                completion(nil)
                return
            }
            completion(data)
        }
        task.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
