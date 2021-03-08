import * as AzureStorageBlob from "@azure/storage-blob";

export async function downloadBlobAsString(
    /** Azure Blob Storage Account Name */
    accountName: string,
    /** SAS Access Token */
    sasString: string,
    /** Container Name */
    containerName: string,
    /** Blob Name */
    blobName: string,
) : Promise<string | undefined> {

    const tmp = `BlobEndpoint=https://${accountName}.blob.core.windows.net/;SharedAccessSignature=${sasString}`;
    const something = new AzureStorageBlob.BlockBlobClient(tmp, containerName, blobName);
    const response = await something.download();
    if (response.blobBody !== undefined) {
        return blobToString(await response.blobBody);
    }
}

export async function uploadBlobAsString(
    /** Azure Blob Storage Account Name */
    accountName: string,
    /** SAS Access Token */
    sasString: string,
    /** Container Name */
    containerName: string,
    /** Blob Name */
    blobName: string,
    /** Blob Content as a string */
    content: string,
) : Promise<boolean> {

    const tmp = `BlobEndpoint=https://${accountName}.blob.core.windows.net/;SharedAccessSignature=${sasString}`;
    const something = new AzureStorageBlob.BlockBlobClient(tmp, containerName, blobName);
    //const something = (new AzureStorageBlob.BlobServiceClient(tmp).getContainerClient(containerName)).getBlobClient(blobName).getBlockBlobClient();
    const response = await something.upload(content, content.length);
    return response.requestId !== undefined;
}

// [Browsers only] A helper method used to convert a browser Blob into string.
async function blobToString(blob: Blob): Promise<string> {
    const fileReader = new FileReader();
    return new Promise<string>((resolve, reject) => {
        fileReader.onloadend = (ev: any) => {
            resolve(ev.target!.result);
        };
        fileReader.onerror = reject;
        fileReader.readAsText(blob);
    });
}
